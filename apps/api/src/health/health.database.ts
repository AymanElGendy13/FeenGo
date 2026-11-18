import type { ModuleDatabase } from '../core/index.js';

/** Health owns no tables (section 4.2): its database can run `select 1` and nothing else. */
export const HEALTH_DATABASE = Symbol('HEALTH_DATABASE');
export type HealthDatabase = ModuleDatabase<never>;
