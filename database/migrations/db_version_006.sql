-- Phase 8: Make citizen names optional on requests.

BEGIN;

ALTER TABLE citizen_request
  DROP CONSTRAINT IF EXISTS chk_citizen_first_name_not_blank,
  DROP CONSTRAINT IF EXISTS chk_citizen_last_name_not_blank;

ALTER TABLE citizen_request
  ALTER COLUMN citizen_first_name DROP NOT NULL,
  ALTER COLUMN citizen_last_name DROP NOT NULL;

COMMIT;
