-- Initial schema for Citizen Request Management System
-- Target DB: PostgreSQL

BEGIN;

CREATE TYPE request_status AS ENUM (
  'NEW',
  'IN_PROGRESS',
  'CLARIFICATION_NEEDED',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE request_priority AS ENUM (
  'NIEDRIG',
  'MITTEL',
  'HOCH',
  'KRITISCH'
);

CREATE TABLE staff_user (
  id               BIGSERIAL PRIMARY KEY,
  first_name       VARCHAR(50) NOT NULL,
  last_name        VARCHAR(50) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_staff_first_name_not_blank CHECK (LENGTH(BTRIM(first_name)) > 0),
  CONSTRAINT chk_staff_last_name_not_blank CHECK (LENGTH(BTRIM(last_name)) > 0),
  CONSTRAINT chk_staff_email_not_blank CHECK (LENGTH(BTRIM(email)) > 0)
);

CREATE TABLE category (
  id               BIGSERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL UNIQUE,
  description      VARCHAR(255),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_category_name_not_blank CHECK (LENGTH(BTRIM(name)) > 0)
);

INSERT INTO category (name, description, is_active)
VALUES
  ('Infrastructur', 'Roads, lights, public facilities maintenance issues.', TRUE),
  ('Umwelt', 'Waste, pollution, parks, and environmental concerns.', TRUE),
  ('Verkehr', 'Road signs, traffic lights, parking, and traffic flow issues.', TRUE),
  ('Sonstiges', 'General requests that do not match predefined categories.', TRUE);

CREATE TABLE citizen_request (
  id                   BIGSERIAL PRIMARY KEY,
  title                VARCHAR(100) NOT NULL,
  description          TEXT NOT NULL,
  category_id          BIGINT NOT NULL REFERENCES category(id),
  priority             request_priority NOT NULL,
  status               request_status NOT NULL DEFAULT 'NEW',
  citizen_first_name   VARCHAR(50) NOT NULL,
  citizen_last_name    VARCHAR(50) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_to_user_id  BIGINT REFERENCES staff_user(id),
  resolved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,

  CONSTRAINT chk_title_not_blank CHECK (LENGTH(BTRIM(title)) > 0),
  CONSTRAINT chk_desc_not_blank CHECK (LENGTH(BTRIM(description)) > 0),
  CONSTRAINT chk_citizen_first_name_not_blank CHECK (LENGTH(BTRIM(citizen_first_name)) > 0),
  CONSTRAINT chk_citizen_last_name_not_blank CHECK (LENGTH(BTRIM(citizen_last_name)) > 0),
  CONSTRAINT chk_resolved_at_for_resolved_or_closed CHECK (
    (status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL)
    OR
    (status NOT IN ('RESOLVED', 'CLOSED'))
  ),
  CONSTRAINT chk_closed_at_for_closed CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL)
    OR
    (status <> 'CLOSED')
  )
);

CREATE TABLE request_comment (
  id               BIGSERIAL PRIMARY KEY,
  request_id       BIGINT NOT NULL REFERENCES citizen_request(id) ON DELETE CASCADE,
  author_user_id   BIGINT REFERENCES staff_user(id),
  author_role      VARCHAR(20) NOT NULL,
  author_display_name VARCHAR(150) NOT NULL,
  comment_text     TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comment_not_blank CHECK (LENGTH(BTRIM(comment_text)) > 0),
  CONSTRAINT chk_comment_author_role CHECK (author_role IN ('CITIZEN', 'WORKER')),
  CONSTRAINT chk_comment_author_display_name_not_blank CHECK (LENGTH(BTRIM(author_display_name)) > 0),
  CONSTRAINT chk_comment_author_by_role CHECK (
    (author_role = 'WORKER' AND author_user_id IS NOT NULL)
    OR
    (author_role = 'CITIZEN' AND author_user_id IS NULL)
  )
);

CREATE TABLE request_status_history (
  id               BIGSERIAL PRIMARY KEY,
  request_id       BIGINT NOT NULL REFERENCES citizen_request(id) ON DELETE CASCADE,
  from_status      request_status,
  to_status        request_status NOT NULL,
  changed_by_user_id BIGINT NOT NULL REFERENCES staff_user(id),
  change_note      VARCHAR(255),
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_from_to_different CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE INDEX idx_requests_status ON citizen_request(status);
CREATE UNIQUE INDEX uq_category_name_normalized ON category ((LOWER(BTRIM(name))));
CREATE INDEX idx_requests_category ON citizen_request(category_id);
CREATE INDEX idx_requests_priority ON citizen_request(priority);
CREATE INDEX idx_requests_assigned_to ON citizen_request(assigned_to_user_id);
CREATE INDEX idx_requests_created_at ON citizen_request(created_at DESC);
CREATE INDEX idx_requests_filter_combo ON citizen_request(status, category_id, priority);
CREATE INDEX idx_comments_request_created_at ON request_comment(request_id, created_at ASC);
CREATE INDEX idx_history_request_changed_at ON request_status_history(request_id, changed_at ASC);

-- Enforce allowed status transitions in history table.
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_status IS NULL AND NEW.to_status <> 'NEW' THEN
    RAISE EXCEPTION 'Initial status must be NEW';
  END IF;

  IF NEW.from_status = 'NEW' AND NEW.to_status NOT IN ('IN_PROGRESS', 'CLARIFICATION_NEEDED') THEN
    RAISE EXCEPTION 'Invalid transition from NEW to %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'IN_PROGRESS' AND NEW.to_status NOT IN ('CLARIFICATION_NEEDED', 'RESOLVED') THEN
    RAISE EXCEPTION 'Invalid transition from IN_PROGRESS to %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'CLARIFICATION_NEEDED' AND NEW.to_status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Invalid transition from CLARIFICATION_NEEDED to %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'RESOLVED' AND NEW.to_status <> 'CLOSED' THEN
    RAISE EXCEPTION 'Invalid transition from RESOLVED to %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'CLOSED' THEN
    RAISE EXCEPTION 'CLOSED requests cannot transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_status_transition
BEFORE INSERT ON request_status_history
FOR EACH ROW
EXECUTE FUNCTION validate_status_transition();

-- Disallow any modifications of already CLOSED requests at DB level.
CREATE OR REPLACE FUNCTION prevent_closed_request_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'CLOSED requests cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_closed_request_updates
BEFORE UPDATE ON citizen_request
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_request_updates();

-- Disallow adding comments to CLOSED requests at DB level.
CREATE OR REPLACE FUNCTION prevent_comments_on_closed_requests()
RETURNS TRIGGER AS $$
DECLARE
  current_status request_status;
BEGIN
  SELECT status INTO current_status
  FROM citizen_request
  WHERE id = NEW.request_id;

  IF current_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Cannot add comments to CLOSED requests';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_comments_on_closed_requests
BEFORE INSERT ON request_comment
FOR EACH ROW
EXECUTE FUNCTION prevent_comments_on_closed_requests();

-- Keep updated_at synced.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_users_updated
BEFORE UPDATE ON staff_user
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_category_updated
BEFORE UPDATE ON category
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_requests_updated
BEFORE UPDATE ON citizen_request
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

COMMIT;
