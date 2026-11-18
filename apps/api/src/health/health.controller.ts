import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_VERSION, NO_QUERY, ZodValidationPipe, type NoQuery } from '../core/index.js';
import type { Liveness, Readiness } from './health.types.js';
import { ReadinessService } from './readiness.service.js';

/**
 * Unversioned probes (section 4.4): no /v1 prefix, so container probes never change.
 * Neither takes a query parameter, so any query parameter is rejected (400).
 */
@Controller('health')
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  /** Liveness. Never touches the database or Redis. */
  @Get()
  // The query is only validated, never read.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  liveness(@Query(new ZodValidationPipe(NO_QUERY)) _query: NoQuery): Liveness {
    return { status: 'ok', version: APP_VERSION, time: new Date().toISOString() };
  }

  /** Readiness: 200 when both dependencies are up, otherwise 503 with the same body. */
  @Get('ready')
  async ready(
    @Query(new ZodValidationPipe(NO_QUERY)) _query: NoQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Readiness> {
    const result = await this.readiness.check();
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
