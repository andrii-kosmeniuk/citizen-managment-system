-- Phase 6: Expand schema with scalable identity model and backfill links.
-- Compatible with existing API contracts (legacy columns kept).

BEGIN;

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
  id                 BIGSERIAL PRIMARY KEY,
  person_id          BIGINT NOT NULL UNIQUE REFERENCES person(id) ON DELETE CASCADE,
  preferred_contact_method VARCHAR(20),
  address_line       VARCHAR(255),
  district           VARCHAR(100),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff_profile (
  id                 BIGSERIAL PRIMARY KEY,
  person_id          BIGINT NOT NULL UNIQUE REFERENCES person(id) ON DELETE CASCADE,
  employee_code      VARCHAR(50) NOT NULL UNIQUE,
  department         VARCHAR(100),
  position_title     VARCHAR(100),
  is_available       BOOLEAN NOT NULL DEFAULT TRUE,
  legacy_staff_user_id BIGINT UNIQUE REFERENCES staff_user(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role (
  id                 BIGSERIAL PRIMARY KEY,
  code               VARCHAR(30) NOT NULL UNIQUE,
  description        VARCHAR(255),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE person_role (
  id                 BIGSERIAL PRIMARY KEY,
  person_id          BIGINT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  role_id            BIGINT NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_person_role UNIQUE (person_id, role_id)
);

INSERT INTO role (code, description)
VALUES
  ('CITIZEN', 'Citizen role for request creation and comments'),
  ('WORKER', 'Staff worker role'),
  ('ADMIN', 'Administrative role')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE staff_user ADD COLUMN person_id BIGINT UNIQUE;
ALTER TABLE staff_user ADD CONSTRAINT fk_staff_user_person FOREIGN KEY (person_id) REFERENCES person(id);

ALTER TABLE citizen_request ADD COLUMN citizen_person_id BIGINT;
ALTER TABLE citizen_request ADD COLUMN created_by_person_id BIGINT;
ALTER TABLE citizen_request ADD COLUMN assigned_to_person_id BIGINT;

ALTER TABLE request_comment ADD COLUMN author_person_id BIGINT;
ALTER TABLE request_status_history ADD COLUMN changed_by_person_id BIGINT;

ALTER TABLE citizen_request
  ADD CONSTRAINT fk_request_citizen_person FOREIGN KEY (citizen_person_id) REFERENCES person(id),
  ADD CONSTRAINT fk_request_created_by_person FOREIGN KEY (created_by_person_id) REFERENCES person(id),
  ADD CONSTRAINT fk_request_assigned_to_person FOREIGN KEY (assigned_to_person_id) REFERENCES person(id);

ALTER TABLE request_comment
  ADD CONSTRAINT fk_comment_author_person FOREIGN KEY (author_person_id) REFERENCES person(id);

ALTER TABLE request_status_history
  ADD CONSTRAINT fk_status_history_changed_by_person FOREIGN KEY (changed_by_person_id) REFERENCES person(id);

-- Backfill person/staff_profile from existing staff users.
INSERT INTO person (first_name, last_name, email, is_active, created_at, updated_at)
SELECT s.first_name, s.last_name, LOWER(BTRIM(s.email)), s.is_active, s.created_at, s.updated_at
FROM staff_user s
LEFT JOIN person p ON p.email = LOWER(BTRIM(s.email))
WHERE p.id IS NULL;

UPDATE staff_user s
SET person_id = p.id
FROM person p
WHERE p.email = LOWER(BTRIM(s.email));

INSERT INTO staff_profile (person_id, employee_code, is_available, legacy_staff_user_id, created_at, updated_at)
SELECT s.person_id, CONCAT('EMP-', s.id), s.is_active, s.id, s.created_at, s.updated_at
FROM staff_user s
LEFT JOIN staff_profile sp ON sp.person_id = s.person_id
WHERE s.person_id IS NOT NULL AND sp.id IS NULL;

-- Assign worker role to all staff persons.
INSERT INTO person_role (person_id, role_id)
SELECT s.person_id, r.id
FROM staff_user s
JOIN role r ON r.code = 'WORKER'
LEFT JOIN person_role pr ON pr.person_id = s.person_id AND pr.role_id = r.id
WHERE s.person_id IS NOT NULL AND pr.id IS NULL;

-- Backfill citizen persons from distinct request names.
WITH distinct_citizens AS (
  SELECT DISTINCT BTRIM(citizen_first_name) AS first_name, BTRIM(citizen_last_name) AS last_name
  FROM citizen_request
)
INSERT INTO person (first_name, last_name, email, is_active)
SELECT d.first_name, d.last_name, NULL, TRUE
FROM distinct_citizens d
LEFT JOIN person p ON p.first_name = d.first_name AND p.last_name = d.last_name AND p.email IS NULL
WHERE p.id IS NULL;

INSERT INTO citizen_profile (person_id)
SELECT p.id
FROM person p
LEFT JOIN citizen_profile cp ON cp.person_id = p.id
WHERE p.email IS NULL AND cp.id IS NULL;

INSERT INTO person_role (person_id, role_id)
SELECT p.id, r.id
FROM person p
JOIN role r ON r.code = 'CITIZEN'
LEFT JOIN person_role pr ON pr.person_id = p.id AND pr.role_id = r.id
WHERE p.email IS NULL AND pr.id IS NULL;

-- Link requests to citizen person.
UPDATE citizen_request cr
SET citizen_person_id = p.id
FROM person p
WHERE p.first_name = BTRIM(cr.citizen_first_name)
  AND p.last_name = BTRIM(cr.citizen_last_name)
  AND p.email IS NULL
  AND cr.citizen_person_id IS NULL;

-- Link request creator to earliest status actor when possible.
WITH initial_actor AS (
  SELECT h.request_id, h.changed_by_user_id,
         ROW_NUMBER() OVER (PARTITION BY h.request_id ORDER BY h.id ASC) AS rn
  FROM request_status_history h
)
UPDATE citizen_request cr
SET created_by_person_id = su.person_id
FROM initial_actor ia
JOIN staff_user su ON su.id = ia.changed_by_user_id
WHERE ia.request_id = cr.id AND ia.rn = 1 AND cr.created_by_person_id IS NULL;

-- Fallback for any request without creator mapping.
UPDATE citizen_request cr
SET created_by_person_id = s.person_id
FROM (SELECT person_id FROM staff_user WHERE person_id IS NOT NULL ORDER BY id ASC LIMIT 1) s
WHERE cr.created_by_person_id IS NULL;

-- Link request assignment person.
UPDATE citizen_request cr
SET assigned_to_person_id = su.person_id
FROM staff_user su
WHERE su.id = cr.assigned_to_user_id AND cr.assigned_to_person_id IS NULL;

-- Link comment author person.
UPDATE request_comment c
SET author_person_id = su.person_id
FROM staff_user su
WHERE c.author_user_id = su.id AND c.author_person_id IS NULL;

UPDATE request_comment c
SET author_person_id = cr.citizen_person_id
FROM citizen_request cr
WHERE c.request_id = cr.id AND c.author_role = 'CITIZEN' AND c.author_person_id IS NULL;

-- Link status history actor person.
UPDATE request_status_history h
SET changed_by_person_id = su.person_id
FROM staff_user su
WHERE su.id = h.changed_by_user_id AND h.changed_by_person_id IS NULL;

CREATE INDEX idx_staff_user_person ON staff_user(person_id);
CREATE INDEX idx_request_citizen_person ON citizen_request(citizen_person_id);
CREATE INDEX idx_request_created_by_person ON citizen_request(created_by_person_id);
CREATE INDEX idx_request_assigned_to_person ON citizen_request(assigned_to_person_id);
CREATE INDEX idx_comment_author_person ON request_comment(author_person_id);
CREATE INDEX idx_status_history_changed_by_person ON request_status_history(changed_by_person_id);

COMMIT;
