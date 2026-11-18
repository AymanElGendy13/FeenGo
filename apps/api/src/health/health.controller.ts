import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_VERSION } from '../core/index.js';
import type { Liveness, Readiness } from './health.types.js';
import { ReadinessService } from './readiness.service.js';

/** Unversioned probes (section 4.4): no /v1 prefix, so container probes never change. */
@Controller('health')
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  /** Liveness. Never touches the database or Redis. */
  @Get()
  liveness(): Liveness {
    return { status: 'ok', version: APP_VERSION, time: new Date().toISOString() };
  }

  /** Readiness: 200 when both dependencies are up, otherwise 503 with the same body. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response): Promise<Readiness> {
    const result = await this.readiness.check();
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
