/**
 * Geofence Service
 *
 * Handles geofence validation for office check-ins.
 * Calculates distance between coordinates and validates
 * against configured office locations.
 */

import { Injectable } from '@nestjs/common';
import { VerificationStatus, AnomalyType, AnomalyStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeofenceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate location against company geofence policy
   */
  async validateLocation(
    companyId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<VerificationStatus> {
    // Get geofence policy
    const policy = await this.prisma.geofencePolicy.findUnique({
      where: { companyId },
    });

    // If geofence not enabled, no verification needed
    if (!policy || !policy.isEnabled) {
      return VerificationStatus.None;
    }

    // If no coordinates provided
    if (latitude === undefined || longitude === undefined) {
      if (policy.requireGeofenceForOffice) {
        return VerificationStatus.GeofenceFailed;
      }
      return VerificationStatus.None;
    }

    // Get office locations
    const offices = await this.prisma.officeLocation.findMany({
      where: { companyId, isActive: true },
    });

    if (offices.length === 0) {
      return VerificationStatus.None;
    }

    // Check if within any office radius
    for (const office of offices) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        Number(office.latitude),
        Number(office.longitude),
      );

      if (distance <= office.radiusMeters) {
        return VerificationStatus.GeofencePassed;
      }
    }

    return VerificationStatus.GeofenceFailed;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns Distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get all office locations for a company
   */
  async getOfficeLocations(companyId: string) {
    return this.prisma.officeLocation.findMany({
      where: { companyId, isActive: true },
    });
  }

  /**
   * Get geofence policy for a company
   */
  async getPolicy(companyId: string) {
    return this.prisma.geofencePolicy.findUnique({
      where: { companyId },
    });
  }

  /**
   * Validate location and create anomaly if geofence fails
   * This is the enhanced version that also creates anomaly events
   */
  async validateAndCreateAnomaly(
    userId: string,
    companyId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<VerificationStatus> {
    // First, perform the validation
    const verificationStatus = await this.validateLocation(
      companyId,
      latitude,
      longitude,
    );

    // If geofence failed, create an anomaly event
    if (verificationStatus === VerificationStatus.GeofenceFailed) {
      // Find the GeofenceFailure anomaly rule
      const rule = await this.prisma.anomalyRule.findFirst({
        where: {
          companyId,
          type: AnomalyType.GeofenceFailure,
          isEnabled: true,
        },
      });

      if (rule) {
        // Create anomaly event
        await this.prisma.anomalyEvent.create({
          data: {
            userId,
            ruleId: rule.id,
            type: AnomalyType.GeofenceFailure,
            severity: rule.severity,
            status: AnomalyStatus.Open,
            title: 'Check-in Outside Geofence',
            description:
              'User attempted Office check-in from location outside configured office radius',
            data: {
              latitude,
              longitude,
              timestamp: new Date().toISOString(),
              verificationStatus,
            },
          },
        });
      }
    }

    return verificationStatus;
  }
}
