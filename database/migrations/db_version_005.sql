-- Phase 7: Remove legacy staff_user and standardize worker references on staff_profile.

BEGIN;

ALTER TABLE citizen_request ADD COLUMN assigned_to_staff_profile_id BIGINT;
ALTER TABLE request_comment ADD COLUMN author_staff_profile_id BIGINT;
ALTER TABLE request_status_history ADD COLUMN changed_by_staff_profile_id BIGINT;

UPDATE citizen_request cr
SET assigned_to_staff_profile_id = sp.id
FROM staff_profile sp
WHERE sp.legacy_staff_user_id = cr.assigned_to_user_id
  AND cr.assigned_to_user_id IS NOT NULL
  AND cr.assigned_to_staff_profile_id IS NULL;

UPDATE request_comment c
SET author_staff_profile_id = sp.id
FROM staff_profile sp
WHERE sp.legacy_staff_user_id = c.author_user_id
  AND c.author_user_id IS NOT NULL
  AND c.author_staff_profile_id IS NULL;

UPDATE request_status_history h
SET changed_by_staff_profile_id = sp.id
FROM staff_profile sp
WHERE sp.legacy_staff_user_id = h.changed_by_user_id
  AND h.changed_by_user_id IS NOT NULL
  AND h.changed_by_staff_profile_id IS NULL;

ALTER TABLE citizen_request
  ADD CONSTRAINT fk_request_assigned_to_staff_profile
  FOREIGN KEY (assigned_to_staff_profile_id) REFERENCES staff_profile(id);

ALTER TABLE request_comment
  ADD CONSTRAINT fk_comment_author_staff_profile
  FOREIGN KEY (author_staff_profile_id) REFERENCES staff_profile(id);

ALTER TABLE request_status_history
  ADD CONSTRAINT fk_status_history_changed_by_staff_profile
  FOREIGN KEY (changed_by_staff_profile_id) REFERENCES staff_profile(id);

ALTER TABLE request_status_history
  ALTER COLUMN changed_by_staff_profile_id SET NOT NULL;

ALTER TABLE request_comment DROP CONSTRAINT IF EXISTS chk_comment_author_by_role;
ALTER TABLE request_comment
  ADD CONSTRAINT chk_comment_author_by_role CHECK (
    (author_role = 'WORKER' AND author_staff_profile_id IS NOT NULL)
    OR
    (author_role = 'CITIZEN' AND author_staff_profile_id IS NULL)
  );

DROP INDEX IF EXISTS idx_requests_assigned_to;
DROP INDEX IF EXISTS idx_staff_user_person;

ALTER TABLE citizen_request DROP COLUMN assigned_to_user_id;
ALTER TABLE request_comment DROP COLUMN author_user_id;
ALTER TABLE request_status_history DROP COLUMN changed_by_user_id;
ALTER TABLE staff_profile DROP COLUMN legacy_staff_user_id;
ALTER TABLE staff_user DROP COLUMN person_id;

DROP TRIGGER IF EXISTS trg_touch_users_updated ON staff_user;
DROP TABLE staff_user;

CREATE INDEX idx_requests_assigned_to_staff_profile ON citizen_request(assigned_to_staff_profile_id);
CREATE INDEX idx_comment_author_staff_profile ON request_comment(author_staff_profile_id);
CREATE INDEX idx_status_history_changed_by_staff_profile ON request_status_history(changed_by_staff_profile_id);

COMMIT;
