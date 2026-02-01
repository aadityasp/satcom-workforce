/**
 * Database Seed Script
 *
 * Creates demo data for the Satcom Workforce MVP including:
 * - Company and policies
 * - Users with different roles
 * - Projects and tasks
 * - Attendance records
 * - Timesheet entries
 * - Leave requests
 * - Anomaly events
 * - Chat threads
 */

import { PrismaClient, UserRole, WorkMode, LeaveTypeCode, AnomalyType, AnomalySeverity, AttendanceEventType, BreakType, VerificationStatus, LeaveRequestStatus, AnomalyStatus, ChatThreadType, ChatMessageType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.anomalyEvent.deleteMany();
  await prisma.anomalyRule.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatMember.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.heartbeatEvent.deleteMany();
  await prisma.presenceSession.deleteMany();
  await prisma.timesheetAttachment.deleteMany();
  await prisma.timesheetEntry.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.leaveTypeConfig.deleteMany();
  await prisma.breakSegment.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.attendanceDay.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.officeLocation.deleteMany();
  await prisma.geofencePolicy.deleteMany();
  await prisma.retentionPolicy.deleteMany();
  await prisma.workPolicy.deleteMany();
  await prisma.deviceRecord.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Create company
  const company = await prisma.company.create({
    data: {
      name: 'Satcom Technologies',
      domain: 'satcom.com',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log('✅ Created company');

  // Create work policy
  await prisma.workPolicy.create({
    data: {
      companyId: company.id,
      standardWorkHours: 8,
      maxWorkHours: 12,
      overtimeThresholdMinutes: 480,
      maxOvertimeMinutes: 240,
      breakDurationMinutes: 15,
      lunchDurationMinutes: 60,
      graceMinutesLate: 15,
      graceMinutesEarly: 15,
    },
  });

  // Create geofence policy
  await prisma.geofencePolicy.create({
    data: {
      companyId: company.id,
      isEnabled: true,
      requireGeofenceForOffice: false,
      allowBypassWithReason: true,
    },
  });

  // Create office location
  await prisma.officeLocation.create({
    data: {
      companyId: company.id,
      name: 'Bangalore HQ',
      address: '123 Tech Park, Electronic City, Bangalore 560100',
      latitude: 12.8456,
      longitude: 77.6603,
      radiusMeters: 100,
    },
  });

  // Create retention policy
  await prisma.retentionPolicy.create({
    data: {
      companyId: company.id,
      chatRetentionDays: 365,
      attachmentRetentionDays: 365,
      anomalyRetentionDays: 730,
      auditLogRetentionDays: 2555,
    },
  });
  console.log('✅ Created policies');

  // Create leave types
  const leaveTypes = await Promise.all([
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Sick Leave', code: LeaveTypeCode.Sick, defaultDays: 12 },
    }),
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Casual Leave', code: LeaveTypeCode.Casual, defaultDays: 12 },
    }),
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Earned Leave', code: LeaveTypeCode.Earned, defaultDays: 15, carryForward: true, maxCarryForward: 30 },
    }),
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Work From Home', code: LeaveTypeCode.WFH, defaultDays: 365 },
    }),
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Comp Off', code: LeaveTypeCode.CompOff, defaultDays: 0 },
    }),
    prisma.leaveTypeConfig.create({
      data: { companyId: company.id, name: 'Loss of Pay', code: LeaveTypeCode.LOP, defaultDays: 0, isPaid: false },
    }),
  ]);
  console.log('✅ Created leave types');

  // Create holidays
  const currentYear = new Date().getFullYear();
  await prisma.holiday.createMany({
    data: [
      { companyId: company.id, name: 'Republic Day', date: new Date(currentYear, 0, 26), year: currentYear },
      { companyId: company.id, name: 'Holi', date: new Date(currentYear, 2, 14), year: currentYear, isOptional: true },
      { companyId: company.id, name: 'Independence Day', date: new Date(currentYear, 7, 15), year: currentYear },
      { companyId: company.id, name: 'Gandhi Jayanti', date: new Date(currentYear, 9, 2), year: currentYear },
      { companyId: company.id, name: 'Diwali', date: new Date(currentYear, 9, 31), year: currentYear },
      { companyId: company.id, name: 'Christmas', date: new Date(currentYear, 11, 25), year: currentYear },
    ],
  });
  console.log('✅ Created holidays');

  // Create anomaly rules
  await prisma.anomalyRule.createMany({
    data: [
      { companyId: company.id, type: AnomalyType.RepeatedLateCheckIn, name: 'Repeated Late Check-Ins', description: 'Multiple late arrivals in a rolling window', severity: AnomalySeverity.Medium, threshold: 3, windowDays: 7, isEnabled: true },
      { companyId: company.id, type: AnomalyType.MissingCheckOut, name: 'Missing Check-Out', description: 'No checkout recorded for the day', severity: AnomalySeverity.High, threshold: 1, windowDays: 1, isEnabled: true },
      { companyId: company.id, type: AnomalyType.ExcessiveBreak, name: 'Excessive Break', description: 'Break duration exceeds policy limit', severity: AnomalySeverity.Medium, threshold: 150, windowDays: 1, isEnabled: true },
      { companyId: company.id, type: AnomalyType.TimesheetMismatch, name: 'Timesheet Mismatch', description: 'Significant variance between attendance and timesheet', severity: AnomalySeverity.Medium, threshold: 20, windowDays: 1, isEnabled: true },
      { companyId: company.id, type: AnomalyType.GeofenceFailure, name: 'Geofence Failure', description: 'Repeated office check-ins outside geofence', severity: AnomalySeverity.High, threshold: 3, windowDays: 30, isEnabled: true },
    ],
  });
  console.log('✅ Created anomaly rules');

  // Hash password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Create users
  const superAdmin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@satcom.com',
      passwordHash,
      role: UserRole.SuperAdmin,
      profile: {
        create: {
          employeeCode: 'SAT001',
          firstName: 'Vijay',
          lastName: 'Kumar',
          designation: 'CEO',
          department: 'Executive',
          joinDate: new Date(2020, 0, 1),
        },
      },
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'hr@satcom.com',
      passwordHash,
      role: UserRole.HR,
      profile: {
        create: {
          employeeCode: 'SAT002',
          firstName: 'Priya',
          lastName: 'Patel',
          designation: 'HR Manager',
          department: 'Human Resources',
          joinDate: new Date(2021, 5, 15),
        },
      },
    },
  });

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'manager@satcom.com',
      passwordHash,
      role: UserRole.Manager,
      profile: {
        create: {
          employeeCode: 'SAT003',
          firstName: 'Vikram',
          lastName: 'Singh',
          designation: 'Engineering Manager',
          department: 'Engineering',
          joinDate: new Date(2021, 2, 1),
        },
      },
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'john@satcom.com',
        passwordHash,
        role: UserRole.Employee,
        profile: {
          create: {
            employeeCode: 'SAT004',
            firstName: 'John',
            lastName: 'Doe',
            designation: 'Senior Developer',
            department: 'Engineering',
            managerId: manager.id,
            joinDate: new Date(2022, 3, 10),
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'jane@satcom.com',
        passwordHash,
        role: UserRole.Employee,
        profile: {
          create: {
            employeeCode: 'SAT005',
            firstName: 'Jane',
            lastName: 'Smith',
            designation: 'UX Designer',
            department: 'Design',
            managerId: manager.id,
            joinDate: new Date(2022, 6, 1),
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        companyId: company.id,
        email: 'bob@satcom.com',
        passwordHash,
        role: UserRole.Employee,
        profile: {
          create: {
            employeeCode: 'SAT006',
            firstName: 'Bob',
            lastName: 'Johnson',
            designation: 'QA Engineer',
            department: 'QA',
            managerId: manager.id,
            joinDate: new Date(2023, 0, 15),
          },
        },
      },
    }),
  ]);
  console.log('✅ Created users');

  const allEmployees = [superAdmin, hrUser, manager, ...employees];

  // Create leave balances for all users
  for (const user of allEmployees) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: lt.id,
          year: currentYear,
          allocated: lt.defaultDays,
        },
      });
    }
  }
  console.log('✅ Created leave balances');

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Website Redesign',
        code: 'WEBR',
        description: 'Company website redesign project',
        managerId: manager.id,
        tasks: {
          create: [
            { name: 'Homepage Design', code: 'HPD' },
            { name: 'Navigation Update', code: 'NAV' },
            { name: 'Mobile Optimization', code: 'MOB' },
          ],
        },
      },
      include: { tasks: true },
    }),
    prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Internal Tools',
        code: 'INTL',
        description: 'Internal productivity tools',
        managerId: manager.id,
        tasks: {
          create: [
            { name: 'Bug Fixes', code: 'BUG' },
            { name: 'New Features', code: 'FEA' },
            { name: 'Documentation', code: 'DOC' },
          ],
        },
      },
      include: { tasks: true },
    }),
    prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Customer Support',
        code: 'SUPP',
        description: 'Customer support and tickets',
        managerId: hrUser.id,
        tasks: {
          create: [
            { name: 'Ticket Resolution', code: 'TKT' },
            { name: 'Customer Calls', code: 'CALL' },
          ],
        },
      },
      include: { tasks: true },
    }),
  ]);
  console.log('✅ Created projects and tasks');

  // Create attendance records for last 7 days (exclude today so users can check in fresh)
  const today = new Date();
  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const user of employees) {
      // Random check-in time between 8:45 and 9:30
      const checkInHour = 8 + Math.floor(Math.random() * 2);
      const checkInMinute = Math.floor(Math.random() * 60);
      const checkInTime = new Date(date);
      checkInTime.setHours(checkInHour, checkInMinute, 0, 0);

      // Check-out time between 17:30 and 19:00
      const checkOutHour = 17 + Math.floor(Math.random() * 2);
      const checkOutMinute = 30 + Math.floor(Math.random() * 30);
      const checkOutTime = new Date(date);
      checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);

      const workMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
      const breakMinutes = 15 + Math.floor(Math.random() * 10);
      const lunchMinutes = 45 + Math.floor(Math.random() * 30);
      const netWorkMinutes = workMinutes - breakMinutes - lunchMinutes;
      const overtimeMinutes = Math.max(0, netWorkMinutes - 480);

      const attendanceDay = await prisma.attendanceDay.create({
        data: {
          userId: user.id,
          date,
          totalWorkMinutes: netWorkMinutes,
          totalBreakMinutes: breakMinutes,
          totalLunchMinutes: lunchMinutes,
          overtimeMinutes,
          isComplete: true,
        },
      });

      // Create check-in event
      await prisma.attendanceEvent.create({
        data: {
          attendanceDayId: attendanceDay.id,
          type: AttendanceEventType.CheckIn,
          timestamp: checkInTime,
          workMode: Math.random() > 0.3 ? WorkMode.Office : WorkMode.Remote,
          verificationStatus: VerificationStatus.GeofencePassed,
        },
      });

      // Create check-out event
      await prisma.attendanceEvent.create({
        data: {
          attendanceDayId: attendanceDay.id,
          type: AttendanceEventType.CheckOut,
          timestamp: checkOutTime,
          workMode: WorkMode.Office,
        },
      });

      // Create break
      const breakStart = new Date(date);
      breakStart.setHours(11, 0, 0, 0);
      await prisma.breakSegment.create({
        data: {
          attendanceDayId: attendanceDay.id,
          type: BreakType.Break,
          startTime: breakStart,
          endTime: new Date(breakStart.getTime() + breakMinutes * 60000),
          durationMinutes: breakMinutes,
        },
      });

      // Create lunch
      const lunchStart = new Date(date);
      lunchStart.setHours(13, 0, 0, 0);
      await prisma.breakSegment.create({
        data: {
          attendanceDayId: attendanceDay.id,
          type: BreakType.Lunch,
          startTime: lunchStart,
          endTime: new Date(lunchStart.getTime() + lunchMinutes * 60000),
          durationMinutes: lunchMinutes,
        },
      });

      // Create timesheet entries
      const project = projects[Math.floor(Math.random() * projects.length)];
      const task = project.tasks[Math.floor(Math.random() * project.tasks.length)];

      await prisma.timesheetEntry.create({
        data: {
          userId: user.id,
          date,
          projectId: project.id,
          taskId: task.id,
          minutes: Math.round(netWorkMinutes * 0.8),
          notes: 'Worked on assigned tasks',
        },
      });
    }
  }
  console.log('✅ Created attendance and timesheet records');

  // Create leave requests
  await prisma.leaveRequest.create({
    data: {
      userId: employees[0].id,
      leaveTypeId: leaveTypes[1].id, // Casual
      startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
      totalDays: 2,
      reason: 'Family function',
      status: LeaveRequestStatus.Pending,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      userId: employees[1].id,
      leaveTypeId: leaveTypes[0].id, // Sick
      startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      totalDays: 1,
      reason: 'Not feeling well',
      status: LeaveRequestStatus.Approved,
      approvedBy: hrUser.id,
      approvedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Created leave requests');

  // Create anomaly events
  const lateCheckInRule = await prisma.anomalyRule.findFirst({
    where: { companyId: company.id, type: AnomalyType.RepeatedLateCheckIn },
  });

  if (lateCheckInRule) {
    await prisma.anomalyEvent.create({
      data: {
        userId: employees[2].id,
        ruleId: lateCheckInRule.id,
        type: AnomalyType.RepeatedLateCheckIn,
        severity: AnomalySeverity.Medium,
        status: AnomalyStatus.Open,
        title: 'Repeated Late Check-Ins',
        description: '4 late arrivals in the last 7 days',
        data: { lateCount: 4, windowDays: 7 },
        detectedAt: new Date(),
      },
    });
  }

  const missingCheckoutRule = await prisma.anomalyRule.findFirst({
    where: { companyId: company.id, type: AnomalyType.MissingCheckOut },
  });

  if (missingCheckoutRule) {
    await prisma.anomalyEvent.create({
      data: {
        userId: employees[0].id,
        ruleId: missingCheckoutRule.id,
        type: AnomalyType.MissingCheckOut,
        severity: AnomalySeverity.High,
        status: AnomalyStatus.Acknowledged,
        title: 'Missing Check-Out',
        description: 'No checkout recorded for yesterday',
        data: { date: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
        detectedAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
        acknowledgedBy: hrUser.id,
        acknowledgedAt: new Date(),
        resolutionNotes: 'Will follow up with employee',
      },
    });
  }
  console.log('✅ Created anomaly events');

  // Create chat threads
  const directThread = await prisma.chatThread.create({
    data: {
      type: ChatThreadType.Direct,
      members: {
        create: [
          { userId: employees[0].id },
          { userId: employees[1].id },
        ],
      },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      { threadId: directThread.id, senderId: employees[0].id, type: ChatMessageType.Text, content: 'Hey, can we sync about the homepage design?' },
      { threadId: directThread.id, senderId: employees[1].id, type: ChatMessageType.Text, content: 'Sure! I\'ll be free after lunch.' },
      { threadId: directThread.id, senderId: employees[0].id, type: ChatMessageType.Text, content: 'Perfect, let\'s meet at 2 PM.' },
    ],
  });

  const projectThread = await prisma.chatThread.create({
    data: {
      type: ChatThreadType.Project,
      name: 'Website Redesign Team',
      projectId: projects[0].id,
      members: {
        create: [
          { userId: manager.id },
          { userId: employees[0].id },
          { userId: employees[1].id },
        ],
      },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      { threadId: projectThread.id, senderId: manager.id, type: ChatMessageType.Text, content: 'Team, let\'s discuss our progress in tomorrow\'s standup.' },
      { threadId: projectThread.id, senderId: employees[0].id, type: ChatMessageType.Text, content: 'Sounds good! I\'ll prepare the update.' },
    ],
  });

  await prisma.chatThread.update({
    where: { id: directThread.id },
    data: { lastMessageAt: new Date() },
  });

  await prisma.chatThread.update({
    where: { id: projectThread.id },
    data: { lastMessageAt: new Date() },
  });
  console.log('✅ Created chat threads');

  // Create presence sessions
  for (const user of allEmployees) {
    await prisma.presenceSession.create({
      data: {
        userId: user.id,
        status: Math.random() > 0.3 ? 'Online' : 'Away',
        lastSeenAt: new Date(),
      },
    });
  }
  console.log('✅ Created presence sessions');

  console.log('\n✨ Seeding complete!');
  console.log('\n📧 Demo accounts:');
  console.log('   admin@satcom.com / Password123! (SuperAdmin)');
  console.log('   hr@satcom.com / Password123! (HR)');
  console.log('   manager@satcom.com / Password123! (Manager)');
  console.log('   john@satcom.com / Password123! (Employee)');
  console.log('   jane@satcom.com / Password123! (Employee)');
  console.log('   bob@satcom.com / Password123! (Employee)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
