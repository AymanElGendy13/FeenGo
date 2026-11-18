import { Module } from '@nestjs/common';
import { moduleDatabaseProvider } from '../core/index.js';
import { SETTINGS_DATABASE, type SettingsTables } from './settings.database.js';

/**
 * The settings store (R-01). C4 creates its tables and this skeleton only; S1 adds
 * SettingsService, its public service, and the first keys (section 6).
 */
@Module({
  providers: [moduleDatabaseProvider<SettingsTables>(SETTINGS_DATABASE)],
})
export class SettingsModule {}
