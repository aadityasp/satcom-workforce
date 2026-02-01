/**
 * Presence Service - Manages user online/away/offline status with activity tracking
 */
import { Injectable } from '@nestjs/common';
import { PresenceStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresenceService {
  private readonly ONLINE_THRESHOLD = 2 * 60 * 1000;  // 2 minutes
  private readonly AWAY_THRESHOLD = 15 * 60 * 1000;   // 15 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Update user presence with optional GPS coordinates and activity tracking
   */
  async updatePresence(userId: string, data: {
    projectId?: string;
    taskId?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const now = new Date();

    // Get current session to check if activity changed
    const currentSession = await this.prisma.presenceSession.findUnique({
      where: { userId },
    });

    const activityChanged = currentSession && (
      currentSession.currentProjectId !== data.projectId ||
      currentSession.currentTaskId !== data.taskId
    );

    // If activity changed, close previous activity log and start new one
    if (activityChanged && currentSession?.currentProjectId) {
      await this.prisma.activityLog.updateMany({
        where: {
          userId,
          endedAt: null,
        },
        data: { endedAt: now },
      });
    }

    // Start new activity log if project specified and activity changed
    if (data.projectId && activityChanged) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          projectId: data.projectId,
          taskId: data.taskId,
          startedAt: now,
        },
      });
    }

    return this.prisma.presenceSession.upsert({
      where: { userId },
      create: {
        userId,
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: data.projectId,
        currentTaskId: data.taskId,
        lastLatitude: data.latitude,
        lastLongitude: data.longitude,
      },
      update: {
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: data.projectId,
        currentTaskId: data.taskId,
        ...(data.latitude !== undefined && { lastLatitude: data.latitude }),
        ...(data.longitude !== undefined && { lastLongitude: data.longitude }),
      },
    });
  }

  /**
   * Set current activity (project/task) for user - ACTV-01
   */
  async setActivity(userId: string, projectId: string, taskId?: string) {
    const now = new Date();

    // Close any existing activity log
    await this.prisma.activityLog.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: now },
    });

    // Start new activity log
    await this.prisma.activityLog.create({
      data: {
        userId,
        projectId,
        taskId,
        startedAt: now,
      },
    });

    // Update presence session
    return this.prisma.presenceSession.upsert({
      where: { userId },
      create: {
        userId,
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: projectId,
        currentTaskId: taskId,
      },
      update: {
        status: PresenceStatus.Online,
        lastSeenAt: now,
        currentProjectId: projectId,
        currentTaskId: taskId,
      },
    });
  }

  /**
   * Post a status update message - ACTV-02
   */
  async postStatusUpdate(userId: string, message: string) {
    const now = new Date();
    return this.prisma.presenceSession.upsert({
      where: { userId },
      create: {
        userId,
        status: PresenceStatus.Online,
        lastSeenAt: now,
        statusMessage: message,
        statusUpdatedAt: now,
      },
      update: {
        status: PresenceStatus.Online,
        lastSeenAt: now,
        statusMessage: message,
        statusUpdatedAt: now,
      },
    });
  }

  /**
   * Clear current status message
   */
  async clearStatus(userId: string) {
    return this.prisma.presenceSession.update({
      where: { userId },
      data: {
        statusMessage: null,
        statusUpdatedAt: null,
      },
    });
  }

  /**
   * Set user as offline
   */
  async setOffline(userId: string) {
    const now = new Date();

    // Close any active activity logs
    await this.prisma.activityLog.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: now },
    });

    return this.prisma.presenceSession.update({
      where: { userId },
      data: { status: PresenceStatus.Offline },
    });
  }

  /**
   * Get availability list with optional status and department filters - PRES-06
   */
  async getAvailabilityList(companyId: string, filters?: {
    status?: PresenceStatus;
    department?: string;
  }) {
    // First, fetch ALL users with their profiles
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        ...(filters?.department && {
          profile: { department: filters.department },
        }),
      },
      include: {
        profile: true,
        presenceSession: true,
      },
    });

    // Get all unique project and task IDs from presence sessions
    const projectIds = users
      .map(u => u.presenceSession?.currentProjectId)
      .filter(Boolean) as string[];
    const taskIds = users
      .map(u => u.presenceSession?.currentTaskId)
      .filter(Boolean) as string[];

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
    let result = users.map((user) => {
      const session = user.presenceSession;
      let status: PresenceStatus = PresenceStatus.Offline;
      let lastSeenAt: Date | null = null;

      if (session) {
        const elapsed = now - session.lastSeenAt.getTime();
        if (elapsed < this.ONLINE_THRESHOLD) {
          status = PresenceStatus.Online;
        } else if (elapsed < this.AWAY_THRESHOLD) {
          status = PresenceStatus.Away;
        } else {
          status = PresenceStatus.Offline;
        }
        lastSeenAt = session.lastSeenAt;
      }

      const project = session?.currentProjectId ? projectMap.get(session.currentProjectId) : null;
      const task = session?.currentTaskId ? taskMap.get(session.currentTaskId) : null;

      return {
        userId: user.id,
        status,
        lastSeenAt,
        currentWorkMode: session?.currentWorkMode ?? null,
        statusMessage: session?.statusMessage ?? null,
        statusUpdatedAt: session?.statusUpdatedAt ?? null,
        currentProject: project ? { id: project.id, name: project.name, code: project.code } : null,
        currentTask: task ? { id: task.id, name: task.name, code: task.code } : null,
        profile: user.profile ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          designation: user.profile.designation,
          department: user.profile.department,
          avatarUrl: user.profile.avatarUrl,
        } : null,
      };
    });

    // Apply status filter if specified
    if (filters?.status) {
      result = result.filter(r => r.status === filters.status);
    }

    return result;
  }

  /**
   * Get team activity for managers/HR/SuperAdmin - ACTV-05
   */
  async getTeamActivity(
    requesterId: string,
    requesterRole: string,
    companyId: string,
    date: Date,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userFilter: any = { companyId };

    if (requesterRole === UserRole.Manager) {
      // Manager sees only their direct reports
      userFilter = {
        companyId,
        profile: { managerId: requesterId },
      };
    }
    // HR and SuperAdmin see all company users

    const users = await this.prisma.user.findMany({
      where: userFilter,
      include: {
        profile: true,
        presenceSession: true,
      },
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get activity logs for the day
    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        startedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return users.map(user => ({
      userId: user.id,
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        designation: user.profile.designation,
        department: user.profile.department,
      } : null,
      presence: user.presenceSession ? {
        status: this.calculateStatus(user.presenceSession.lastSeenAt),
        statusMessage: user.presenceSession.statusMessage,
        currentProjectId: user.presenceSession.currentProjectId,
        currentTaskId: user.presenceSession.currentTaskId,
      } : null,
      activities: activityLogs.filter(a => a.userId === user.id),
    }));
  }

  /**
   * Get task time breakdown for a user - ACTV-04
   */
  async getTaskTimeBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const logs = await this.prisma.activityLog.findMany({
      where: {
        userId,
        startedAt: { gte: startDate, lte: endDate },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    // Calculate duration for each log
    const breakdown = logs.map(log => {
      const endTime = log.endedAt || new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - log.startedAt.getTime()) / 60000
      );

      return {
        id: log.id,
        project: log.project,
        task: log.task,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        durationMinutes,
      };
    });

    // Aggregate by project/task
    const byProject = new Map<string, {
      project: { id: string; name: string; code: string };
      totalMinutes: number;
      tasks: Map<string, { task: { id: string; name: string; code: string }; minutes: number }>;
    }>();

    for (const item of breakdown) {
      if (!item.project) continue;

      const existing = byProject.get(item.project.id) || {
        project: item.project,
        totalMinutes: 0,
        tasks: new Map(),
      };

      existing.totalMinutes += item.durationMinutes;

      if (item.task) {
        const taskEntry = existing.tasks.get(item.task.id) || {
          task: item.task,
          minutes: 0,
        };
        taskEntry.minutes += item.durationMinutes;
        existing.tasks.set(item.task.id, taskEntry);
      }

      byProject.set(item.project.id, existing);
    }

    return {
      detailed: breakdown,
      summary: Array.from(byProject.values()).map(p => ({
        project: p.project,
        totalMinutes: p.totalMinutes,
        tasks: Array.from(p.tasks.values()),
      })),
    };
  }

  /**
   * Calculate dynamic presence status based on last seen time
   */
  private calculateStatus(lastSeenAt: Date): PresenceStatus {
    const elapsed = Date.now() - lastSeenAt.getTime();
    if (elapsed < this.ONLINE_THRESHOLD) return PresenceStatus.Online;
    if (elapsed < this.AWAY_THRESHOLD) return PresenceStatus.Away;
    return PresenceStatus.Offline;
  }
}
