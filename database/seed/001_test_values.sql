-- Seed data for local development/testing.
-- Compatible with the latest schema.
-- Safe to run multiple times.

BEGIN;

INSERT INTO person (first_name, last_name, email, is_active)
VALUES
  ('Mia', 'Schneider', 'mia.schneider@city.example', TRUE),
  ('Lukas', 'Weber', 'lukas.weber@city.example', TRUE),
  ('Sofia', 'Keller', 'sofia.keller@city.example', TRUE)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = EXCLUDED.is_active;

INSERT INTO staff_profile (person_id, employee_code, is_available)
SELECT p.id, v.employee_code, TRUE
FROM (
  VALUES
    ('mia.schneider@city.example', 'EMP-MIA'),
    ('lukas.weber@city.example', 'EMP-LUKAS'),
    ('sofia.keller@city.example', 'EMP-SOFIA')
) AS v(email, employee_code)
JOIN person p ON p.email = v.email
ON CONFLICT (employee_code) DO UPDATE
SET
  person_id = EXCLUDED.person_id,
  is_available = EXCLUDED.is_available;

INSERT INTO person_role (person_id, role_id)
SELECT p.id, r.id
FROM person p
JOIN role r ON r.code = 'WORKER'
WHERE p.email IN ('mia.schneider@city.example', 'lukas.weber@city.example', 'sofia.keller@city.example')
ON CONFLICT (person_id, role_id) DO NOTHING;

UPDATE category
SET is_active = TRUE
WHERE name IN ('Infrastructur', 'Umwelt', 'Verkehr', 'Sonstiges');

INSERT INTO person (first_name, last_name, email, is_active)
VALUES
  ('Anna', 'Mueller', NULL, TRUE),
  ('Peter', 'Schmidt', NULL, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO citizen_profile (person_id)
SELECT p.id
FROM person p
WHERE (p.first_name, p.last_name) IN (('Anna', 'Mueller'), ('Peter', 'Schmidt'))
ON CONFLICT (person_id) DO NOTHING;

INSERT INTO person_role (person_id, role_id)
SELECT p.id, r.id
FROM person p
JOIN role r ON r.code = 'CITIZEN'
WHERE (p.first_name, p.last_name) IN (('Anna', 'Mueller'), ('Peter', 'Schmidt'))
ON CONFLICT (person_id, role_id) DO NOTHING;

INSERT INTO citizen_request (
  title,
  description,
  category_id,
  priority,
  status,
  citizen_first_name,
  citizen_last_name,
  assigned_to_staff_profile_id,
  citizen_person_id,
  created_by_person_id,
  assigned_to_person_id
)
SELECT
  'Broken street light',
  'Street light is not working near house number 24.',
  c.id,
  'HOCH',
  'NEW',
  cp.first_name,
  cp.last_name,
  sp.id,
  cp.id,
  wp.id,
  wp.id
FROM category c
JOIN person cp ON cp.first_name = 'Anna' AND cp.last_name = 'Mueller'
JOIN person wp ON wp.email = 'mia.schneider@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE c.name = 'Infrastructur'
  AND NOT EXISTS (
    SELECT 1 FROM citizen_request r WHERE r.title = 'Broken street light'
  );

INSERT INTO request_status_history (
  request_id,
  from_status,
  to_status,
  changed_by_staff_profile_id,
  changed_by_person_id,
  change_note
)
SELECT
  r.id,
  NULL,
  'NEW',
  sp.id,
  wp.id,
  'Initial status'
FROM citizen_request r
JOIN person wp ON wp.email = 'mia.schneider@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE r.title = 'Broken street light'
  AND NOT EXISTS (
    SELECT 1 FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status IS NULL
      AND h.to_status = 'NEW'
  );

INSERT INTO citizen_request (
  title,
  description,
  category_id,
  priority,
  status,
  citizen_first_name,
  citizen_last_name,
  assigned_to_staff_profile_id,
  citizen_person_id,
  created_by_person_id,
  assigned_to_person_id
)
SELECT
  'Traffic light timing issue',
  'Red light is too short at the central junction.',
  c.id,
  'MITTEL',
  'IN_PROGRESS',
  cp.first_name,
  cp.last_name,
  sp.id,
  cp.id,
  wp.id,
  wp.id
FROM category c
JOIN person cp ON cp.first_name = 'Peter' AND cp.last_name = 'Schmidt'
JOIN person wp ON wp.email = 'lukas.weber@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE c.name = 'Verkehr'
  AND NOT EXISTS (
    SELECT 1 FROM citizen_request r WHERE r.title = 'Traffic light timing issue'
  );

INSERT INTO request_status_history (
  request_id,
  from_status,
  to_status,
  changed_by_staff_profile_id,
  changed_by_person_id,
  change_note
)
SELECT
  r.id,
  NULL,
  'NEW',
  sp.id,
  wp.id,
  'Initial status'
FROM citizen_request r
JOIN person wp ON wp.email = 'lukas.weber@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1 FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status IS NULL
      AND h.to_status = 'NEW'
  );

INSERT INTO request_status_history (
  request_id,
  from_status,
  to_status,
  changed_by_staff_profile_id,
  changed_by_person_id,
  change_note
)
SELECT
  r.id,
  'NEW',
  'IN_PROGRESS',
  sp.id,
  wp.id,
  'Investigation started'
FROM citizen_request r
JOIN person wp ON wp.email = 'lukas.weber@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1 FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status = 'NEW'
      AND h.to_status = 'IN_PROGRESS'
  );

INSERT INTO request_comment (
  request_id,
  author_staff_profile_id,
  author_person_id,
  author_role,
  author_display_name,
  comment_text
)
SELECT
  r.id,
  sp.id,
  wp.id,
  'WORKER',
  CONCAT(wp.first_name, ' ', wp.last_name),
  'Team scheduled onsite inspection for tomorrow.'
FROM citizen_request r
JOIN person wp ON wp.email = 'sofia.keller@city.example'
JOIN staff_profile sp ON sp.person_id = wp.id
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1 FROM request_comment c
    WHERE c.request_id = r.id
      AND c.comment_text = 'Team scheduled onsite inspection for tomorrow.'
  );

COMMIT;
