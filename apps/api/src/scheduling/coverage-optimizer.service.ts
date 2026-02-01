/**
 * Coverage Optimizer Service
 *
 * Optimizes shift coverage to meet demand while minimizing costs.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftStatus } from '@prisma/client';
import { format, getHours, addHours } from 'date-fns';

interface CoverageGap {
  hour: number;
  required: number;
  actual: number;
  gap: number;
}

interface OptimizationSuggestion {
  type: 'add_shift' | 'extend_shift' | 'reassign';
  description: string;
  estimatedImpact: number;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class CoverageOptimizerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Analyze coverage for a date range
   */
  async analyzeCoverage(
    companyId: string,
    startDate: Date,
    endDate: Date
  ) {
    const coverageByHour: Record<string, { required: number; actual: number }> = {};

    // Get all shifts in range
    const shifts = await this.prisma.shift.findMany({
      where: {
        companyId,
        startTime: { gte: startDate, lte: endDate },
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress, ShiftStatus.Completed] },
      },
    });

    // Get staffing requirements
    const requirements = await this.getStaffingRequirements(companyId);

    // Initialize coverage map
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dayRequirements = requirements[dayOfWeek] || {};

      for (let hour = 0; hour < 24; hour++) {
        const key = `${format(currentDate, 'yyyy-MM-dd')}-${hour}`;
        coverageByHour[key] = {
          required: dayRequirements[hour] || 1,
          actual: 0,
        };
      }

      currentDate = addHours(currentDate, 24);
    }

    // Count actual coverage
    for (const shift of shifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const dateKey = format(shiftStart, 'yyyy-MM-dd');

      let currentHour = getHours(shiftStart);
      const endHour = getHours(shiftEnd);

      while (currentHour < endHour || (endHour < currentHour && currentHour < 24)) {
        const key = `${dateKey}-${currentHour}`;
        if (coverageByHour[key]) {
          coverageByHour[key].actual++;
        }
        currentHour++;
        if (currentHour >= 24) {
          currentHour = 0;
        }
      }
    }

    // Identify gaps
    const gaps: CoverageGap[] = [];
    const overstaffed: CoverageGap[] = [];

    for (const [key, coverage] of Object.entries(coverageByHour)) {
      const gap = coverage.required - coverage.actual;
      if (gap > 0) {
        const [date, hour] = key.split('-');
        gaps.push({
          hour: parseInt(hour),
          required: coverage.required,
          actual: coverage.actual,
          gap,
        });
      } else if (gap < -1) {
        const [date, hour] = key.split('-');
        overstaffed.push({
          hour: parseInt(hour),
          required: coverage.required,
          actual: coverage.actual,
          gap: Math.abs(gap),
        });
      }
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(gaps, overstaffed);

    return {
      coverageByHour,
      gaps,
      overstaffed,
      suggestions,
      summary: {
        totalGaps: gaps.reduce((sum, g) => sum + g.gap, 0),
        totalOverstaffed: overstaffed.reduce((sum, o) => sum + o.gap, 0),
        coveragePercentage: this.calculateCoveragePercentage(coverageByHour),
      },
    };
  }

  /**
   * Get staffing requirements by day of week
   */
  private async getStaffingRequirements(companyId: string): Promise<Record<number, Record<number, number>>> {
    // Get work policy
    const policy = await this.prisma.workPolicy.findUnique({
      where: { companyId },
    });

    // Default requirements if no policy
    const defaultRequirements: Record<number, number> = {};
    for (let hour = 0; hour < 24; hour++) {
      if (hour >= 9 && hour < 17) {
        defaultRequirements[hour] = 3; // Business hours
      } else if (hour >= 7 && hour < 22) {
        defaultRequirements[hour] = 1; // Extended hours
      } else {
        defaultRequirements[hour] = 0; // Off hours
      }
    }

    // Apply to all days
    const requirements: Record<number, Record<number, number>> = {};
    for (let day = 0; day < 7; day++) {
      // Reduce requirements on weekends
      if (day === 0 || day === 6) {
        requirements[day] = Object.fromEntries(
          Object.entries(defaultRequirements).map(([h, r]) => [h, Math.floor(r * 0.5)])
        );
      } else {
        requirements[day] = defaultRequirements;
      }
    }

    return requirements;
  }

  /**
   * Generate optimization suggestions
   */
  private generateSuggestions(gaps: CoverageGap[], overstaffed: CoverageGap[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggest adding shifts for major gaps
    const majorGaps = gaps.filter(g => g.gap >= 2);
    for (const gap of majorGaps.slice(0, 5)) {
      suggestions.push({
        type: 'add_shift',
        description: `Add ${gap.gap} staff for hour ${gap.hour} (${gap.actual}/${gap.required} covered)`,
        estimatedImpact: gap.gap * 1,
        priority: 'high',
      });
    }

    // Suggest reassigning from overstaffed periods
    if (overstaffed.length > 0 && gaps.length > 0) {
      suggestions.push({
        type: 'reassign',
        description: 'Reassign staff from overstaffed periods to cover gaps',
        estimatedImpact: Math.min(
          overstaffed.reduce((sum, o) => sum + o.gap, 0),
          gaps.reduce((sum, g) => sum + g.gap, 0)
        ),
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall coverage percentage
   */
  private calculateCoveragePercentage(
    coverageByHour: Record<string, { required: number; actual: number }>
  ): number {
    let totalRequired = 0;
    let totalActual = 0;

    for (const coverage of Object.values(coverageByHour)) {
      totalRequired += coverage.required;
      totalActual += Math.min(coverage.actual, coverage.required);
    }

    return totalRequired > 0 ? Math.round((totalActual / totalRequired) * 100) : 100;
  }

  /**
   * Get optimal shift times based on demand
   */
  async getOptimalShiftTimes(
    companyId: string,
    date: Date
  ) {
    const coverage = await this.analyzeCoverage(companyId, date, date);
    
    // Find peak demand hours
    const hourlyDemand: Record<number, number> = {};
    for (const [key, value] of Object.entries(coverage.coverageByHour)) {
      const hour = parseInt(key.split('-')[1]);
      hourlyDemand[hour] = (hourlyDemand[hour] || 0) + value.required;
    }

    // Find optimal start times (when demand increases)
    const optimalStarts: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const prevHour = hour === 0 ? 23 : hour - 1;
      if (hourlyDemand[hour] > hourlyDemand[prevHour]) {
        optimalStarts.push(hour);
      }
    }

    // Find optimal end times (when demand decreases)
    const optimalEnds: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const nextHour = hour === 23 ? 0 : hour + 1;
      if (hourlyDemand[hour] > hourlyDemand[nextHour]) {
        optimalEnds.push(hour);
      }
    }

    return {
      optimalStartTimes: optimalStarts,
      optimalEndTimes: optimalEnds,
      hourlyDemand,
    };
  }
}
