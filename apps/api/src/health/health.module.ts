import { Module } from '@nestjs/common';
import { moduleDatabaseProvider } from '../core/index.js';
import { DependencyProbes } from './dependency-probes.js';
import { HEALTH_DATABASE } from './health.database.js';
import { HealthController } from './health.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  controllers: [HealthController],
  providers: [moduleDatabaseProvider<never>(HEALTH_DATABASE), DependencyProbes, ReadinessService],
})
export class HealthModule {}
