import { Module } from '@nestjs/common';
import { DependencyProbes } from './dependency-probes.js';
import { HealthController } from './health.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  controllers: [HealthController],
  providers: [DependencyProbes, ReadinessService],
})
export class HealthModule {}
