import { Inject, Injectable } from '@nestjs/common';
import type { Logger } from 'pino';
import { ROOT_LOGGER } from '../core/index.js';
import { DependencyProbes } from './dependency-probes.js';
import type { Dependency, DependencyStatus, Readiness } from './health.types.js';

/** Each check gets this long before its dependency counts as down (contract: getReadiness). */
export const DEPENDENCY_TIMEOUT_MS = 1_000;
/** A result is reused for this long, so a flood of probes never reaches the database. */
export const READINESS_CACHE_MS = 1_000;

class DependencyTimeoutError extends Error {
  constructor() {
    super(`No answer within ${DEPENDENCY_TIMEOUT_MS} ms`);
  }
}

interface ProbeResult {
  status: DependencyStatus;
  error?: unknown;
}

async function runProbe(check: () => Promise<void>): Promise<ProbeResult> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DependencyTimeoutError()), DEPENDENCY_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', error };
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class ReadinessService {
  private cached?: { at: number; result: Readiness };
  private inFlight?: Promise<Readiness>;
  private readonly lastStatus: Partial<Record<Dependency, DependencyStatus>> = {};
  private readonly logger: Logger;

  constructor(
    private readonly probes: DependencyProbes,
    @Inject(ROOT_LOGGER) rootLogger: Logger,
  ) {
    this.logger = rootLogger.child({ context: 'Readiness' });
  }

  /**
   * Checks the database and Redis at the same time. A result less than
   * READINESS_CACHE_MS old is returned as it is, and concurrent callers share one
   * check.
   */
  check(): Promise<Readiness> {
    if (this.cached !== undefined && Date.now() - this.cached.at < READINESS_CACHE_MS) {
      return Promise.resolve(this.cached.result);
    }
    this.inFlight ??= this.runChecks().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async runChecks(): Promise<Readiness> {
    const [database, redis] = await Promise.all([
      runProbe(() => this.probes.database()),
      runProbe(() => this.probes.redis()),
    ]);
    this.recordChange('database', database);
    this.recordChange('redis', redis);
    const result: Readiness = {
      status: database.status === 'up' && redis.status === 'up' ? 'ok' : 'unavailable',
      checks: { database: database.status, redis: redis.status },
    };
    this.cached = { at: Date.now(), result };
    return result;
  }

  /** Logs when a dependency goes down or comes back, not on every probe. */
  private recordChange(dependency: Dependency, result: ProbeResult): void {
    const previous = this.lastStatus[dependency];
    this.lastStatus[dependency] = result.status;
    if (result.status === 'down' && previous !== 'down') {
      this.logger.warn({ dependency, err: result.error }, 'readiness check failed');
    } else if (result.status === 'up' && previous === 'down') {
      this.logger.info({ dependency }, 'readiness check recovered');
    }
  }
}
