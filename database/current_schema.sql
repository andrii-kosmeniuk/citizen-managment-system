-- Current canonical database schema after db_version_005.
-- This file is a fresh-install snapshot of the final schema state.
-- Seed/reference data stays in database/seed/.

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

CREATE TABLE person (
  id                 BIGSERIAL PRIMARY KEY,
  first_name         VARCHAR(50) NOT NULL,
  last_name          VARCHAR(50) NOT NULL,
  email              VARCHAR(255) UNIQUE,
  phone              VARCHAR(30),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_person_first_name_not_blank CHECK (LENGTH(BTRIM(first_name)) > 0),
  CONSTRAINT chk_person_last_name_not_blank CHECK (LENGTH(BTRIM(last_name)) > 0)
);

CREATE TABLE citizen_profile (
  id                       BIGSERIAL PRIMARY KEY,
  person_id                BIGINT NOT NULL UNIQUE,
  preferred_contact_method VARCHAR(20),
  address_line             VARCHAR(255),
  district                 VARCHAR(100),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_citizen_profile_person
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

CREATE TABLE staff_profile (
  id                 BIGSERIAL PRIMARY KEY,
  person_id          BIGINT NOT NULL UNIQUE,
  employee_code      VARCHAR(50) NOT NULL UNIQUE,
  department         VARCHAR(100),
  position_title     VARCHAR(100),
  is_available       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_staff_profile_person
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

CREATE TABLE role (
  id                 BIGSERIAL PRIMARY KEY,
  code               VARCHAR(30) NOT NULL UNIQUE,
  description        VARCHAR(255),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role (code, description)
VALUES
  ('CITIZEN', 'Citizen role for request creation and comments'),
  ('WORKER', 'Staff worker role'),
  ('ADMIN', 'Administrative role');

CREATE TABLE person_role (
  id                 BIGSERIAL PRIMARY KEY,
  person_id          BIGINT NOT NULL,
  role_id            BIGINT NOT NULL,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_person_role_person
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
  CONSTRAINT fk_person_role_role
    FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE RESTRICT,
  CONSTRAINT uq_person_role UNIQUE (person_id, role_id)
);

CREATE TABLE category (
  id                 BIGSERIAL PRIMARY KEY,
  name               VARCHAR(100) NOT NULL UNIQUE,
  description        VARCHAR(255),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_category_name_not_blank CHECK (LENGTH(BTRIM(name)) > 0)
);

INSERT INTO category (name, description, is_active)
VALUES
  ('Infrastructur', 'Roads, lights, public facilities maintenance issues.', TRUE),
  ('Umwelt', 'Waste, pollution, parks, and environmental concerns.', TRUE),
  ('Verkehr', 'Road signs, traffic lights, parking, and traffic flow issues.', TRUE),
  ('Sonstiges', 'General requests that do not match predefined categories.', TRUE);

CREATE TABLE citizen_request (
  id                           BIGSERIAL PRIMARY KEY,
  title                        VARCHAR(100) NOT NULL,
  description                  TEXT NOT NULL,
  category_id                  BIGINT NOT NULL,
  priority                     request_priority NOT NULL,
  status                       request_status NOT NULL DEFAULT 'NEW',
  citizen_first_name           VARCHAR(50) NOT NULL,
  citizen_last_name            VARCHAR(50) NOT NULL,
  citizen_person_id            BIGINT,
  created_by_person_id         BIGINT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_to_staff_profile_id BIGINT,
  assigned_to_person_id        BIGINT,
  resolved_at                  TIMESTAMPTZ,
  closed_at                    TIMESTAMPTZ,

  CONSTRAINT fk_request_category
    FOREIGN KEY (category_id) REFERENCES category(id),
  CONSTRAINT fk_request_citizen_person
    FOREIGN KEY (citizen_person_id) REFERENCES person(id),
  CONSTRAINT fk_request_created_by_person
    FOREIGN KEY (created_by_person_id) REFERENCES person(id),
  CONSTRAINT fk_request_assigned_to_person
    FOREIGN KEY (assigned_to_person_id) REFERENCES person(id),
  CONSTRAINT fk_request_assigned_to_staff_profile
    FOREIGN KEY (assigned_to_staff_profile_id) REFERENCES staff_profile(id),
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
  id                      BIGSERIAL PRIMARY KEY,
  request_id              BIGINT NOT NULL,
  author_staff_profile_id BIGINT,
  author_person_id        BIGINT,
  author_role             VARCHAR(20) NOT NULL,
  author_display_name     VARCHAR(150) NOT NULL,
  comment_text            TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_comment_request
    FOREIGN KEY (request_id) REFERENCES citizen_request(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_author_staff_profile
    FOREIGN KEY (author_staff_profile_id) REFERENCES staff_profile(id),
  CONSTRAINT fk_comment_author_person
    FOREIGN KEY (author_person_id) REFERENCES person(id),
  CONSTRAINT chk_comment_not_blank CHECK (LENGTH(BTRIM(comment_text)) > 0),
  CONSTRAINT chk_comment_author_role CHECK (author_role IN ('CITIZEN', 'WORKER')),
  CONSTRAINT chk_comment_author_display_name_not_blank CHECK (LENGTH(BTRIM(author_display_name)) > 0),
  CONSTRAINT chk_comment_author_by_role CHECK (
    (author_role = 'WORKER' AND author_staff_profile_id IS NOT NULL)
    OR
    (author_role = 'CITIZEN' AND author_staff_profile_id IS NULL)
  )
);

CREATE TABLE request_status_history (
  id                           BIGSERIAL PRIMARY KEY,
  request_id                   BIGINT NOT NULL,
  from_status                  request_status,
  to_status                    request_status NOT NULL,
  changed_by_staff_profile_id  BIGINT NOT NULL,
  changed_by_person_id         BIGINT,
  change_note                  VARCHAR(255),
  changed_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_status_history_request
    FOREIGN KEY (request_id) REFERENCES citizen_request(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_history_changed_by_staff_profile
    FOREIGN KEY (changed_by_staff_profile_id) REFERENCES staff_profile(id),
  CONSTRAINT fk_status_history_changed_by_person
    FOREIGN KEY (changed_by_person_id) REFERENCES person(id),
  CONSTRAINT chk_from_to_different CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE UNIQUE INDEX uq_category_name_normalized ON category ((LOWER(BTRIM(name))));

CREATE INDEX idx_requests_status ON citizen_request(status);
CREATE INDEX idx_requests_category ON citizen_request(category_id);
CREATE INDEX idx_requests_priority ON citizen_request(priority);
CREATE INDEX idx_requests_created_at ON citizen_request(created_at DESC);
CREATE INDEX idx_requests_filter_combo ON citizen_request(status, category_id, priority);
CREATE INDEX idx_request_citizen_person ON citizen_request(citizen_person_id);
CREATE INDEX idx_request_created_by_person ON citizen_request(created_by_person_id);
CREATE INDEX idx_request_assigned_to_person ON citizen_request(assigned_to_person_id);
CREATE INDEX idx_requests_assigned_to_staff_profile ON citizen_request(assigned_to_staff_profile_id);

CREATE INDEX idx_comments_request_created_at ON request_comment(request_id, created_at ASC);
CREATE INDEX idx_comment_author_person ON request_comment(author_person_id);
CREATE INDEX idx_comment_author_staff_profile ON request_comment(author_staff_profile_id);

CREATE INDEX idx_history_request_changed_at ON request_status_history(request_id, changed_at ASC);
CREATE INDEX idx_status_history_changed_by_person ON request_status_history(changed_by_person_id);
CREATE INDEX idx_status_history_changed_by_staff_profile ON request_status_history(changed_by_staff_profile_id);

CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_status IS NULL AND NEW.to_status <> 'NEW' THEN
    RAISE EXCEPTION 'Der initiale Status muss NEW sein';
  END IF;

  IF NEW.from_status = 'NEW' AND NEW.to_status NOT IN ('IN_PROGRESS', 'CLARIFICATION_NEEDED') THEN
    RAISE EXCEPTION 'Ungueltiger Statuswechsel von NEW zu %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'IN_PROGRESS' AND NEW.to_status NOT IN ('CLARIFICATION_NEEDED', 'RESOLVED') THEN
    RAISE EXCEPTION 'Ungueltiger Statuswechsel von IN_PROGRESS zu %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'CLARIFICATION_NEEDED' AND NEW.to_status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Ungueltiger Statuswechsel von CLARIFICATION_NEEDED zu %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'RESOLVED' AND NEW.to_status <> 'CLOSED' THEN
    RAISE EXCEPTION 'Ungueltiger Statuswechsel von RESOLVED zu %', NEW.to_status;
  END IF;

  IF NEW.from_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Geschlossene Anliegen duerfen den Status nicht aendern';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_closed_request_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Geschlossene Anliegen duerfen nicht bearbeitet werden';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_comments_on_closed_requests()
RETURNS TRIGGER AS $$
DECLARE
  current_status request_status;
BEGIN
  SELECT status INTO current_status
  FROM citizen_request
  WHERE id = NEW.request_id;

  IF current_status = 'CLOSED' THEN
    RAISE EXCEPTION 'Zu geschlossenen Anliegen koennen keine Kommentare hinzugefuegt werden';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_status_transition
BEFORE INSERT ON request_status_history
FOR EACH ROW
EXECUTE FUNCTION validate_status_transition();

CREATE TRIGGER trg_prevent_closed_request_updates
BEFORE UPDATE ON citizen_request
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_request_updates();

CREATE TRIGGER trg_prevent_comments_on_closed_requests
BEFORE INSERT ON request_comment
FOR EACH ROW
EXECUTE FUNCTION prevent_comments_on_closed_requests();

CREATE TRIGGER trg_touch_category_updated
BEFORE UPDATE ON category
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_requests_updated
BEFORE UPDATE ON citizen_request
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

COMMIT;
