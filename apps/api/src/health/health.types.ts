// Response bodies of the health endpoints (docs/api/openapi.yaml: Liveness, Readiness).

export interface Liveness {
  status: 'ok';
  version: string;
  time: string;
}

export type DependencyStatus = 'up' | 'down';
export type Dependency = 'database' | 'redis';

export interface Readiness {
  status: 'ok' | 'unavailable';
  checks: Record<Dependency, DependencyStatus>;
}
