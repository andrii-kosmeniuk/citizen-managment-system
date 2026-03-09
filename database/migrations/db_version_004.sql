-- Localize DB-level validation error messages to German for existing databases.

BEGIN;

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

COMMIT;
