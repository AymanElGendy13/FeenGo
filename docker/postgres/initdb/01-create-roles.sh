#!/bin/bash
# Creates FeenGo's two database roles (docs/ARCHITECTURE.md section 5.1) in the
# local Docker Compose database. The Postgres image runs this once, only when the
# data volume is empty. To run it again: `docker compose down -v`, then `up -d`.
#
#   feengo_migrator  owns the database and the public schema, and runs migrations.
#   feengo_app       what the API connects as: SELECT, INSERT, UPDATE, DELETE on
#                    tables the migrator creates, and no DDL. Tables that need
#                    less (admin_activity_log: SELECT, INSERT only) revoke the rest
#                    in their own migration.
#
# Passwords come from the container environment (see docker-compose.yml and
# .env.example). They are passed to psql as variables, never pasted into SQL.
set -euo pipefail

: "${FEENGO_MIGRATOR_PASSWORD:?FEENGO_MIGRATOR_PASSWORD must be set}"
: "${FEENGO_APP_PASSWORD:?FEENGO_APP_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db_name="$POSTGRES_DB" \
  -v migrator_password="$FEENGO_MIGRATOR_PASSWORD" \
  -v app_password="$FEENGO_APP_PASSWORD" <<'SQL'
CREATE ROLE feengo_migrator
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'migrator_password';

CREATE ROLE feengo_app
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  PASSWORD :'app_password';

-- The database owner also owns the public schema (pg_database_owner, PostgreSQL 15+),
-- so the migrator can create and drop objects there and nobody else can.
ALTER DATABASE :"db_name" OWNER TO feengo_migrator;

REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db_name" TO feengo_app;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO feengo_app;

-- Tables and sequences the migrator creates later are usable by the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE feengo_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO feengo_app;
ALTER DEFAULT PRIVILEGES FOR ROLE feengo_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO feengo_app;
SQL
