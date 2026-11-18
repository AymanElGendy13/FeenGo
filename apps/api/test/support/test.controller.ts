import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ProblemException } from '../../src/core/index.js';

/** Values planted in errors; none of them may reach a log or a response. */
export const PLANTED = {
  name: 'planted-name-6b1e0c4a',
  code: 'planted-code-93d2f7e1',
  detail: 'Key (phone_e164)=(+201009876543) already exists.',
} as const;

/** An error such as a module might raise, with its own code and type. */
export class PlantedFailure extends Error {
  readonly errorCode = 'PLANTED_FAILURE';
}

/** Routes that exist only in tests, mounted next to the real ones. */
@Controller('test')
export class TestController {
  constructor(private readonly logger: PinoLogger) {}

  @Get('ip')
  ip(@Req() req: Request): { ip: string | undefined } {
    return { ip: req.ip };
  }

  @Post('echo')
  @HttpCode(200)
  echo(@Body() body: unknown): { size: number } {
    return { size: JSON.stringify(body).length };
  }

  @Get('planted-failure')
  plantedFailure(): never {
    const error = new PlantedFailure('the planted failure');
    Object.assign(error, { name: PLANTED.name, code: PLANTED.code, detail: PLANTED.detail });
    throw error;
  }

  /** A 503 that no error caused, as readiness answers when a dependency is down. */
  @Get('plain-503')
  plain503(@Res({ passthrough: true }) res: Response): { status: string } {
    res.status(503);
    return { status: 'unavailable' };
  }

  @Get('unavailable')
  unavailable(): never {
    throw new ProblemException(503, 'SERVICE_UNAVAILABLE');
  }

  /** Logs personal data by mistake, as a careless log call might. */
  @Post('careless-log')
  @HttpCode(200)
  carelessLog(@Body() body: Record<string, unknown>): { logged: true } {
    this.logger.info(
      {
        phone: body.phone,
        code: body.code,
        accessToken: body.token,
        refreshToken: body.token,
        customer: { phone: body.phone, email: body.email, name: body.name, phone_e164: body.phone },
      },
      'careless log call',
    );
    return { logged: true };
  }
}
