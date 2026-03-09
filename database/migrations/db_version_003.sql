-- Phase 6 follow-up: localize request_priority enum values to German.
-- Safe to run once via schema_migrations pipeline.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'request_priority' AND e.enumlabel = 'LOW'
  ) THEN
    ALTER TYPE request_priority RENAME VALUE 'LOW' TO 'NIEDRIG';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'request_priority' AND e.enumlabel = 'MEDIUM'
  ) THEN
    ALTER TYPE request_priority RENAME VALUE 'MEDIUM' TO 'MITTEL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'request_priority' AND e.enumlabel = 'HIGH'
  ) THEN
    ALTER TYPE request_priority RENAME VALUE 'HIGH' TO 'HOCH';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'request_priority' AND e.enumlabel = 'CRITICAL'
  ) THEN
    ALTER TYPE request_priority RENAME VALUE 'CRITICAL' TO 'KRITISCH';
  END IF;
END $$;

COMMIT;
