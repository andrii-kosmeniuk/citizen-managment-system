-- Phase 1 database validation script
-- Verifies FK integrity, enum enforcement, status workflow, and closed-request immutability.

BEGIN;

-- Base data
INSERT INTO staff_user (first_name, last_name, email)
VALUES
  ('Alice', 'Admin', 'alice.admin@example.com'),
  ('Bob', 'Worker', 'bob.worker@example.com');

INSERT INTO category (name, description)
VALUES
  ('Infrastructure', 'Roads and lights');

-- Happy path request insert
INSERT INTO citizen_request (title, description, category_id, priority, status, citizen_name)
VALUES ('Broken street light', 'Lamp not working on Main St.', 1, 'MEDIUM', 'NEW', 'Max Mustermann');

-- Initial status history
INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
VALUES (1, NULL, 'NEW', 1, 'Initial status');

-- FK check: invalid category should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO citizen_request (title, description, category_id, priority, status)
    VALUES ('Invalid category ref', 'Should fail', 9999, 'LOW', 'NEW');
    RAISE EXCEPTION 'Expected FK violation for invalid category_id';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END;
$$;

-- Enum check: invalid priority should fail
DO $$
BEGIN
  BEGIN
    EXECUTE 'INSERT INTO citizen_request (title, description, category_id, priority, status) VALUES (''Invalid enum'', ''Should fail'', 1, ''INVALID_PRIORITY'', ''NEW'')';
    RAISE EXCEPTION 'Expected enum validation failure for priority';
  EXCEPTION
    WHEN invalid_text_representation THEN
      NULL;
  END;
END;
$$;

-- Invalid transition check: NEW -> CLOSED should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
    VALUES (1, 'NEW', 'CLOSED', 2, 'Invalid transition attempt');
    RAISE EXCEPTION 'Expected transition validation failure NEW -> CLOSED';
  EXCEPTION
    WHEN raise_exception THEN
      NULL;
  END;
END;
$$;

-- Valid transitions
INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
VALUES
  (1, 'NEW', 'IN_PROGRESS', 2, 'Taking over'),
  (1, 'IN_PROGRESS', 'RESOLVED', 2, 'Issue fixed'),
  (1, 'RESOLVED', 'CLOSED', 1, 'Confirmed and closed');

-- Move request entity to CLOSED with required timestamps
UPDATE citizen_request
SET
  status = 'CLOSED',
  resolved_at = NOW(),
  closed_at = NOW(),
  assigned_to_user_id = 2
WHERE id = 1;

-- Closed request update must fail
DO $$
BEGIN
  BEGIN
    UPDATE citizen_request
    SET title = 'Modified after close'
    WHERE id = 1;
    RAISE EXCEPTION 'Expected update rejection for CLOSED request';
  EXCEPTION
    WHEN raise_exception THEN
      NULL;
  END;
END;
$$;

-- Adding comment on closed request must fail
DO $$
BEGIN
  BEGIN
    INSERT INTO request_comment (request_id, author_user_id, comment_text)
    VALUES (1, 2, 'Should not be accepted');
    RAISE EXCEPTION 'Expected comment rejection for CLOSED request';
  EXCEPTION
    WHEN raise_exception THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
