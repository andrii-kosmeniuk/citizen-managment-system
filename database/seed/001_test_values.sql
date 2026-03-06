-- Seed data for local development/testing.
-- Safe to run multiple times.

BEGIN;

INSERT INTO staff_user (first_name, last_name, email, is_active)
VALUES
  ('Mia', 'Schneider', 'mia.schneider@city.example', TRUE),
  ('Lukas', 'Weber', 'lukas.weber@city.example', TRUE),
  ('Sofia', 'Keller', 'sofia.keller@city.example', TRUE)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  is_active = EXCLUDED.is_active;

-- Ensure fixed categories are active.
UPDATE category
SET is_active = TRUE
WHERE name IN ('Infrastructure', 'Environment', 'Traffic', 'Other');

-- Request 1 (Infrastructure, NEW)
INSERT INTO citizen_request (
  title,
  description,
  category_id,
  priority,
  status,
  citizen_first_name,
  citizen_last_name,
  assigned_to_user_id
)
SELECT
  'Broken street light',
  'Street light is not working near house number 24.',
  c.id,
  'HIGH',
  'NEW',
  'Anna',
  'Mueller',
  u.id
FROM category c
CROSS JOIN staff_user u
WHERE c.name = 'Infrastructure'
  AND u.email = 'mia.schneider@city.example'
  AND NOT EXISTS (
    SELECT 1 FROM citizen_request r WHERE r.title = 'Broken street light on Main St'
  );

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
SELECT
  r.id,
  NULL,
  'NEW',
  u.id,
  'Initial status'
FROM citizen_request r
JOIN staff_user u ON u.email = 'mia.schneider@city.example'
WHERE r.title = 'Broken street light on Main St'
  AND NOT EXISTS (
    SELECT 1
    FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status IS NULL
      AND h.to_status = 'NEW'
  );

-- Request 2 (Traffic, IN_PROGRESS)
INSERT INTO citizen_request (
  title,
  description,
  category_id,
  priority,
  status,
  citizen_first_name,
  citizen_last_name,
  assigned_to_user_id
)
SELECT
  'Traffic light timing issue',
  'Red light is too short at the central junction.',
  c.id,
  'MEDIUM',
  'IN_PROGRESS',
  'Peter',
  'Schmidt',
  u.id
FROM category c
CROSS JOIN staff_user u
WHERE c.name = 'Traffic'
  AND u.email = 'lukas.weber@city.example'
  AND NOT EXISTS (
    SELECT 1 FROM citizen_request r WHERE r.title = 'Traffic light timing issue'
  );

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
SELECT
  r.id,
  NULL,
  'NEW',
  u.id,
  'Initial status'
FROM citizen_request r
JOIN staff_user u ON u.email = 'lukas.weber@city.example'
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1
    FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status IS NULL
      AND h.to_status = 'NEW'
  );

INSERT INTO request_status_history (request_id, from_status, to_status, changed_by_user_id, change_note)
SELECT
  r.id,
  'NEW',
  'IN_PROGRESS',
  u.id,
  'Investigation started'
FROM citizen_request r
JOIN staff_user u ON u.email = 'lukas.weber@city.example'
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1
    FROM request_status_history h
    WHERE h.request_id = r.id
      AND h.from_status = 'NEW'
      AND h.to_status = 'IN_PROGRESS'
  );

INSERT INTO request_comment (request_id, author_user_id, comment_text)
SELECT
  r.id,
  u.id,
  'Team scheduled onsite inspection for tomorrow.'
FROM citizen_request r
JOIN staff_user u ON u.email = 'sofia.keller@city.example'
WHERE r.title = 'Traffic light timing issue'
  AND NOT EXISTS (
    SELECT 1
    FROM request_comment c
    WHERE c.request_id = r.id
      AND c.comment_text = 'Team scheduled onsite inspection for tomorrow.'
  );

COMMIT;
