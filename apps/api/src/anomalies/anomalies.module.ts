/**
 * Anomalies Module - Rules-based anomaly detection and resolution
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnomaliesService } from './anomalies.service';
import { AnomaliesController } from './anomalies.controller';
import { AnomalyDetectionService } from './anomaly-detection.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AnomaliesController],
  providers: [AnomaliesService, AnomalyDetectionService],
  exports: [AnomaliesService],
})
export class AnomaliesModule {}
