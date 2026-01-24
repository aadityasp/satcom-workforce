/**
 * Presence Service - Manages user online/away/offline status
 */
import { Injectable } from '@nestjs/common';
import { PresenceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceService {
  private readonly ONLINE_THRESHOLD = 2 * 60 * 1000;  // 2 minutes
  private readonly AWAY_THRESHOLD = 15 * 60 * 1000;   // 15 minutes

  constructor(private prisma: PrismaService) {}

  async updatePresence(userId: string, data: { projectId?: string; taskId?: string }) {
    const now = new Date();
    return this.prisma.presenceSession.upsert({
      where: { userId },
      create: {
        userId,
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: data.projectId,
        currentTaskId: data.taskId,
      },
      update: {
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: data.projectId,
        currentTaskId: data.taskId,
      },
    });
  }

  async setOffline(userId: string) {
    return this.prisma.presenceSession.update({
      where: { userId },
      data: { status: PresenceStatus.Offline },
    });
  }

  async getAvailabilityList(companyId: string) {
    const sessions = await this.prisma.presenceSession.findMany({
      where: { user: { companyId } },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    // Get all unique project and task IDs
    const projectIds = sessions.map(s => s.currentProjectId).filter(Boolean) as string[];
    const taskIds = sessions.map(s => s.currentTaskId).filter(Boolean) as string[];

    // Fetch project and task names
    const [projects, tasks] = await Promise.all([
      projectIds.length > 0
        ? this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true, code: true },
          })
        : [],
      taskIds.length > 0
        ? this.prisma.task.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, name: true, code: true },
          })
        : [],
    ]);

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const now = Date.now();
    return sessions.map((s) => {
      const elapsed = now - s.lastSeenAt.getTime();
      let status: PresenceStatus;
      if (elapsed < this.ONLINE_THRESHOLD) {
        status = PresenceStatus.Online;
      } else if (elapsed < this.AWAY_THRESHOLD) {
        status = PresenceStatus.Away;
      } else {
        status = PresenceStatus.Offline;
      }

      const project = s.currentProjectId ? projectMap.get(s.currentProjectId) : null;
      const task = s.currentTaskId ? taskMap.get(s.currentTaskId) : null;

      return {
        userId: s.userId,
        status,
        lastSeenAt: s.lastSeenAt,
        currentWorkMode: s.currentWorkMode,
        currentProject: project ? { id: project.id, name: project.name, code: project.code } : null,
        currentTask: task ? { id: task.id, name: task.name, code: task.code } : null,
        profile: s.user.profile ? {
          firstName: s.user.profile.firstName,
          lastName: s.user.profile.lastName,
          designation: s.user.profile.designation,
          avatarUrl: s.user.profile.avatarUrl,
        } : null,
      };
    });
  }
}
