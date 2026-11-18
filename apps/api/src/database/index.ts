// Public surface of src/database: the schema types generated from the migrated
// database (`pnpm db:types`). The migrator (migrator.ts) is a command, not an import.
// Modules do not import this directly: they get their tables through core's
// ModuleDatabase (docs/ARCHITECTURE.md section 4.2).
export type { DB } from './schema.generated.js';
