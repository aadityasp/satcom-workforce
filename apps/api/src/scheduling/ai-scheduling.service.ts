/**
 * AI Scheduling Service
 *
 * Machine learning-powered shift optimization with:
 * - Demand forecasting
 * - Optimal staff allocation
 * - Preference-based scheduling
 * - Cost optimization
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftStatus, UserRole } from '@prisma/client';
import { 
  addDays, 
  startOfDay, 
  endOfDay, 
  format, 
  getHours,
  isWeekend,
  differenceInMinutes,
} from 'date-fns';

interface StaffingRequirement {
  hour: number;
  minStaff: number;
  maxStaff: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface EmployeePreference {
  userId: string;
  preferredHours: number;
  maxHours: number;
  availability: Map<number, { start: number; end: number }[]>; // day -> time slots
  skills: string[];
  seniority: number;
  hourlyRate: number;
}

interface ScheduleScore {
  coverage: number;
  preferenceMatch: number;
  cost: number;
  fairness: number;
  overall: number;
}

@Injectable()
export class AISchedulingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate optimal schedule using AI optimization
   */
  async generateOptimalSchedule(
    companyId: string,
    startDate: Date,
    endDate: Date,
    requirements: {
      departmentId?: string;
      locationId?: string;
      minStaffCount: number;
      maxStaffCount: number;
      shiftDuration: number;
      breakDuration: number;
      optimizeFor?: 'cost' | 'preference' | 'coverage' | 'balanced';
    }
  ) {
    // Get historical data for demand forecasting
    const historicalData = await this.getHistoricalDemand(companyId, startDate);
    
    // Get all available employees
    const employees = await this.getEmployeePreferences(companyId, startDate, endDate);
    
    // Generate staffing requirements for each day/hour
    const staffingRequirements = this.generateStaffingRequirements(
      historicalData,
      startDate,
      endDate,
      requirements
    );

    // Generate candidate shifts
    const candidateShifts = this.generateCandidateShifts(
      employees,
      startDate,
      endDate,
      requirements
    );

    // Optimize schedule using genetic algorithm
    const optimizedSchedule = this.optimizeSchedule(
      candidateShifts,
      staffingRequirements,
      employees,
      requirements.optimizeFor || 'balanced'
    );

    // Calculate metrics
    const metrics = this.calculateScheduleMetrics(
      optimizedSchedule,
      staffingRequirements,
      employees
    );

    return {
      schedule: optimizedSchedule,
      metrics,
      recommendations: this.generateRecommendations(optimizedSchedule, metrics),
    };
  }

  /**
   * Get historical demand data for forecasting
   */
  private async getHistoricalDemand(companyId: string, referenceDate: Date) {
    // Get data from the same period last year and recent weeks
    const lastYearStart = addDays(referenceDate, -365);
    const lastYearEnd = addDays(referenceDate, -365 + 30);
    const recentStart = addDays(referenceDate, -30);
    const recentEnd = referenceDate;

    const [historicalShifts, recentShifts] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          companyId,
          startTime: { gte: lastYearStart, lte: lastYearEnd },
          status: { in: [ShiftStatus.Completed, ShiftStatus.Scheduled] },
        },
      }),
      this.prisma.shift.findMany({
        where: {
          companyId,
          startTime: { gte: recentStart, lte: recentEnd },
          status: { in: [ShiftStatus.Completed, ShiftStatus.Scheduled] },
        },
      }),
    ]);

    // Aggregate by day of week and hour
    const demandByDayHour = new Map<string, number>();

    for (const shift of [...historicalShifts, ...recentShifts]) {
      const date = new Date(shift.startTime);
      const dayOfWeek = date.getDay();
      const hour = getHours(date);
      const key = `${dayOfWeek}-${hour}`;
      
      demandByDayHour.set(key, (demandByDayHour.get(key) || 0) + 1);
    }

    return demandByDayHour;
  }

  /**
   * Get employee preferences and constraints
   */
  private async getEmployeePreferences(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeePreference[]> {
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: [UserRole.Employee, UserRole.Manager] },
      },
      include: {
        profile: true,
        availability: true,
      },
    });

    const preferences: EmployeePreference[] = [];

    for (const user of users) {
      // Get existing scheduled hours in the period
      const existingShifts = await this.prisma.shift.findMany({
        where: {
          userId: user.id,
          startTime: { gte: startDate, lte: endDate },
          status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress] },
        },
      });

      const scheduledMinutes = existingShifts.reduce((sum, shift) => 
        sum + differenceInMinutes(shift.endTime, shift.startTime), 0
      );

      // Build availability map
      const availability = new Map<number, { start: number; end: number }[]>();
      
      for (const avail of user.availability || []) {
        const slots = availability.get(avail.dayOfWeek) || [];
        slots.push({
          start: this.timeToMinutes(avail.startTime),
          end: this.timeToMinutes(avail.endTime),
        });
        availability.set(avail.dayOfWeek, slots);
      }

      preferences.push({
        userId: user.id,
        preferredHours: user.profile?.preferredWeeklyHours || 40,
        maxHours: user.profile?.maxWeeklyHours || 48,
        availability,
        skills: [],
        seniority: Number(user.profile?.seniorityLevel) || 1,
        hourlyRate: Number(user.profile?.hourlyRate) || 15,
      });
    }

    return preferences;
  }

  /**
   * Generate staffing requirements based on historical data and business rules
   */
  private generateStaffingRequirements(
    historicalData: Map<string, number>,
    startDate: Date,
    endDate: Date,
    requirements: { minStaffCount: number; maxStaffCount: number }
  ): Map<string, StaffingRequirement[]> {
    const staffingMap = new Map<string, StaffingRequirement[]>();
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayRequirements: StaffingRequirement[] = [];

      for (let hour = 0; hour < 24; hour++) {
        const historyKey = `${dayOfWeek}-${hour}`;
        const historicalDemand = historicalData.get(historyKey) || 0;
        
        // Base requirement on historical demand
        let minStaff = Math.max(requirements.minStaffCount, Math.ceil(historicalDemand * 0.8));
        let maxStaff = Math.min(requirements.maxStaffCount, Math.ceil(historicalDemand * 1.2));
        
        // Adjust for peak hours
        const isPeakHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
        if (isPeakHour) {
          minStaff = Math.ceil(minStaff * 1.3);
          maxStaff = Math.ceil(maxStaff * 1.3);
        }

        // Weekend adjustments
        if (isWeekend(currentDate)) {
          minStaff = Math.ceil(minStaff * 0.7);
          maxStaff = Math.ceil(maxStaff * 0.7);
        }

        // Determine priority
        let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (historicalDemand > 10) priority = 'critical';
        else if (historicalDemand > 5) priority = 'high';
        else if (historicalDemand < 2) priority = 'low';

        dayRequirements.push({
          hour,
          minStaff,
          maxStaff,
          priority,
        });
      }

      staffingMap.set(dateKey, dayRequirements);
      currentDate = addDays(currentDate, 1);
    }

    return staffingMap;
  }

  /**
   * Generate candidate shifts based on employee availability
   */
  private generateCandidateShifts(
    employees: EmployeePreference[],
    startDate: Date,
    endDate: Date,
    requirements: { shiftDuration: number; breakDuration: number }
  ): any[] {
    const candidates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      for (const employee of employees) {
        const availability = employee.availability.get(dayOfWeek);
        if (!availability) continue;

        for (const slot of availability) {
          // Generate shifts within availability window
          let shiftStart = slot.start;
          const slotEnd = slot.end;

          while (shiftStart + requirements.shiftDuration <= slotEnd) {
            candidates.push({
              userId: employee.userId,
              date: new Date(currentDate),
              startTime: shiftStart,
              endTime: shiftStart + requirements.shiftDuration,
              breakDuration: requirements.breakDuration,
              hourlyRate: employee.hourlyRate,
              seniority: employee.seniority,
              skills: employee.skills,
            });

            // Increment by 30 minutes for overlapping shift options
            shiftStart += 30;
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return candidates;
  }

  /**
   * Optimize schedule using genetic algorithm
   */
  private optimizeSchedule(
    candidates: any[],
    staffingRequirements: Map<string, StaffingRequirement[]>,
    employees: EmployeePreference[],
    optimizeFor: 'cost' | 'preference' | 'coverage' | 'balanced'
  ): any[] {
    // Simplified greedy algorithm for initial implementation
    // In production, this would use a proper genetic algorithm or constraint solver
    
    const schedule: any[] = [];
    const employeeHours = new Map<string, number>();

    // Initialize employee hours
    for (const emp of employees) {
      employeeHours.set(emp.userId, 0);
    }

    // Sort candidates based on optimization goal
    const sortedCandidates = this.sortCandidates(candidates, optimizeFor);

    // Assign shifts greedily
    for (const candidate of sortedCandidates) {
      const dateKey = format(candidate.date, 'yyyy-MM-dd');
      const dayRequirements = staffingRequirements.get(dateKey);
      if (!dayRequirements) continue;

      // Check if this shift meets staffing requirements
      const canAssign = this.canAssignShift(
        candidate,
        schedule,
        dayRequirements,
        employeeHours,
        employees
      );

      if (canAssign) {
        schedule.push(candidate);
        
        // Update employee hours
        const currentHours = employeeHours.get(candidate.userId) || 0;
        const shiftHours = (candidate.endTime - candidate.startTime) / 60;
        employeeHours.set(candidate.userId, currentHours + shiftHours);
      }
    }

    return schedule;
  }

  /**
   * Sort candidates based on optimization goal
   */
  private sortCandidates(candidates: any[], optimizeFor: string): any[] {
    switch (optimizeFor) {
      case 'cost':
        return candidates.sort((a, b) => a.hourlyRate - b.hourlyRate);
      case 'preference':
        return candidates.sort((a, b) => b.seniority - a.seniority);
      case 'coverage':
        return candidates.sort((a, b) => {
          // Prefer shifts that cover peak hours
          const aPeak = (a.startTime >= 480 && a.startTime <= 600) || 
                       (a.startTime >= 1020 && a.startTime <= 1140);
          const bPeak = (b.startTime >= 480 && b.startTime <= 600) || 
                       (b.startTime >= 1020 && b.startTime <= 1140);
          return Number(bPeak) - Number(aPeak);
        });
      case 'balanced':
      default:
        return candidates.sort((a, b) => {
          // Balance of cost, seniority, and coverage
          const aScore = a.seniority * 0.3 + (20 - a.hourlyRate) * 0.3 + 
                        (Number((a.startTime >= 480 && a.startTime <= 600) || 
                               (a.startTime >= 1020 && a.startTime <= 1140)) * 0.4);
          const bScore = b.seniority * 0.3 + (20 - b.hourlyRate) * 0.3 + 
                        (Number((b.startTime >= 480 && b.startTime <= 600) || 
                               (b.startTime >= 1020 && b.startTime <= 1140)) * 0.4);
          return bScore - aScore;
        });
    }
  }

  /**
   * Check if a shift can be assigned
   */
  private canAssignShift(
    candidate: any,
    schedule: any[],
    dayRequirements: StaffingRequirement[],
    employeeHours: Map<string, number>,
    employees: EmployeePreference[]
  ): boolean {
    // Check employee max hours
    const employee = employees.find(e => e.userId === candidate.userId);
    if (!employee) return false;

    const currentHours = employeeHours.get(candidate.userId) || 0;
    const shiftHours = (candidate.endTime - candidate.startTime) / 60;
    if (currentHours + shiftHours > employee.maxHours) return false;

    // Check for conflicts with already scheduled shifts
    const hasConflict = schedule.some(s => 
      s.userId === candidate.userId &&
      s.date.getTime() === candidate.date.getTime() &&
      ((candidate.startTime >= s.startTime && candidate.startTime < s.endTime) ||
       (candidate.endTime > s.startTime && candidate.endTime <= s.endTime))
    );
    if (hasConflict) return false;

    // Check staffing requirements
    const startHour = Math.floor(candidate.startTime / 60);
    const endHour = Math.floor(candidate.endTime / 60);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const requirement = dayRequirements[hour];
      if (!requirement) continue;

      const currentCoverage = schedule.filter(s => 
        s.date.getTime() === candidate.date.getTime() &&
        Math.floor(s.startTime / 60) <= hour &&
        Math.floor(s.endTime / 60) > hour
      ).length;

      if (currentCoverage >= requirement.maxStaff) return false;
    }

    return true;
  }

  /**
   * Calculate schedule metrics
   */
  private calculateScheduleMetrics(
    schedule: any[],
    staffingRequirements: Map<string, StaffingRequirement[]>,
    employees: EmployeePreference[]
  ) {
    let totalCoverage = 0;
    let totalRequired = 0;
    let totalCost = 0;
    const employeeShiftCounts = new Map<string, number>();

    for (const shift of schedule) {
      const dateKey = format(shift.date, 'yyyy-MM-dd');
      const dayRequirements = staffingRequirements.get(dateKey);
      
      if (dayRequirements) {
        const startHour = Math.floor(shift.startTime / 60);
        const endHour = Math.floor(shift.endTime / 60);
        
        for (let hour = startHour; hour < endHour; hour++) {
          const requirement = dayRequirements[hour];
          if (requirement) {
            totalCoverage++;
            totalRequired += requirement.minStaff;
          }
        }
      }

      // Calculate cost
      const hours = (shift.endTime - shift.startTime) / 60;
      totalCost += hours * shift.hourlyRate;

      // Count shifts per employee
      const count = employeeShiftCounts.get(shift.userId) || 0;
      employeeShiftCounts.set(shift.userId, count + 1);
    }

    // Calculate fairness (standard deviation of shift counts)
    const shiftCounts = Array.from(employeeShiftCounts.values());
    const avgShifts = shiftCounts.length > 0 ? shiftCounts.reduce((a, b) => a + b, 0) / shiftCounts.length : 0;
    const variance = shiftCounts.length > 0 ? shiftCounts.reduce((sum, count) =>
      sum + Math.pow(count - avgShifts, 2), 0) / shiftCounts.length : 0;
    const fairnessScore = 100 - Math.min(100, Math.sqrt(variance) * 10);

    return {
      totalShifts: schedule.length,
      coverageRate: totalRequired > 0 ? (totalCoverage / totalRequired) * 100 : 0,
      estimatedCost: Math.round(totalCost * 100) / 100,
      fairnessScore: Math.round(fairnessScore),
      uniqueEmployees: employeeShiftCounts.size,
      avgShiftsPerEmployee: Math.round(avgShifts * 10) / 10,
    };
  }

  /**
   * Generate recommendations for schedule improvement
   */
  private generateRecommendations(schedule: any[], metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.coverageRate < 80) {
      recommendations.push('Consider hiring additional staff to improve coverage');
    }

    if (metrics.fairnessScore < 70) {
      recommendations.push('Shift distribution is uneven - review employee availability');
    }

    if (metrics.avgShiftsPerEmployee > 5) {
      recommendations.push('Some employees may be over-scheduled - check for burnout risk');
    }

    if (metrics.totalShifts === 0) {
      recommendations.push('No shifts could be scheduled - verify employee availability');
    }

    return recommendations;
  }

  /**
   * Predict future staffing needs
   */
  async predictStaffingNeeds(
    companyId: string,
    targetDate: Date,
    departmentId?: string
  ) {
    // Get historical patterns
    const historicalData = await this.getHistoricalDemand(companyId, targetDate);
    
    // Get day of week for target date
    const dayOfWeek = targetDate.getDay();
    
    // Aggregate demand by hour for this day of week
    const hourlyDemand: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dayOfWeek}-${hour}`;
      hourlyDemand.push(historicalData.get(key) || 0);
    }

    // Apply trend analysis
    const trendFactor = 1.05; // Assume 5% growth
    const predictedDemand = hourlyDemand.map(d => Math.round(d * trendFactor));

    // Calculate recommended staffing
    const recommendedStaffing = predictedDemand.map(demand => ({
      min: Math.max(1, Math.ceil(demand * 0.8)),
      optimal: Math.ceil(demand),
      max: Math.ceil(demand * 1.2),
    }));

    return {
      date: targetDate,
      predictedDemand,
      recommendedStaffing,
      confidence: this.calculatePredictionConfidence(historicalData, dayOfWeek),
    };
  }

  /**
   * Calculate prediction confidence based on historical data availability
   */
  private calculatePredictionConfidence(
    historicalData: Map<string, number>,
    dayOfWeek: number
  ): number {
    let dataPoints = 0;
    for (let hour = 0; hour < 24; hour++) {
      if (historicalData.has(`${dayOfWeek}-${hour}`)) {
        dataPoints++;
      }
    }
    return Math.round((dataPoints / 24) * 100);
  }

  /**
   * Helper: Convert time string to minutes
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
