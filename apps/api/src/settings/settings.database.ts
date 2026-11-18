import type { ModuleDatabase } from '../core/index.js';

/** The tables the settings module owns (docs/ARCHITECTURE.md sections 4.2 and 6.1). */
export type SettingsTables = 'setting_definitions' | 'settings';

/**
 * The settings module's database: only its own tables. Other modules read settings
 * through SettingsService (S1), never through this token, which index.ts does not export.
 */
export const SETTINGS_DATABASE = Symbol('SETTINGS_DATABASE');
export type SettingsDatabase = ModuleDatabase<SettingsTables>;
