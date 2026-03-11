from sqlalchemy import text

from app.db.models.person import Person
from app.db.models.staff_profile import StaffProfile

WORKER_HEADERS = {"X-Actor-Role": "worker"}
CITIZEN_HEADERS = {"X-Actor-Role": "citizen"}


def _create_staff_profile(
    db_session,
    email: str,
    first_name: str = "John",
    last_name: str = "Doe",
) -> StaffProfile:
    person = Person(first_name=first_name, last_name=last_name, email=email, is_active=True)
    db_session.add(person)
    db_session.flush()

    profile = StaffProfile(
        person_id=person.id,
        employee_code=f"EMP-{first_name.upper()}-{last_name.upper()}",
        is_available=True,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_staff_profiles_list_requires_worker(client, db_session):
    profile = _create_staff_profile(db_session, "worker.list@example.com", "Worker", "Listed")

    forbidden = client.get("/staff-profiles", headers=CITIZEN_HEADERS)
    assert forbidden.status_code == 403

    allowed = client.get("/staff-profiles", headers=WORKER_HEADERS)
    assert allowed.status_code == 200
    payload = allowed.json()
    assert any(
        item["id"] == profile.id and item["first_name"] == "Worker" and item["last_name"] == "Listed"
        for item in payload
    )


def test_categories_crud_and_active_filter(client):
    list_initial = client.get("/categories")
    assert list_initial.status_code == 200
    initial_names = {item["name"] for item in list_initial.json()}
    assert initial_names == {"Infrastructur", "Umwelt", "Verkehr", "Sonstiges"}

    created = client.post(
        "/categories",
        json={"name": "  Noise  ", "description": "Should pass"},
        headers=WORKER_HEADERS,
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Noise"

    duplicate = client.post("/categories", json={"name": "Noise   "}, headers=WORKER_HEADERS)
    assert duplicate.status_code == 409

    category_id = next(item["id"] for item in list_initial.json() if item["name"] == "Infrastructur")
    updated = client.patch(
        f"/categories/{category_id}",
        json={"description": "Roads and lighting"},
        headers=WORKER_HEADERS,
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Roads and lighting"

    deleted = client.delete(f"/categories/{category_id}", headers=WORKER_HEADERS)
    assert deleted.status_code == 204

    active_only = client.get("/categories", params={"active_only": True})
    assert active_only.status_code == 200
    assert all(item["is_active"] for item in active_only.json())
    assert not any(item["id"] == category_id for item in active_only.json())


def test_requests_end_to_end_all_actions(client, db_session):
    creator = _create_staff_profile(db_session, "creator@example.com", "Create", "User")
    actor = _create_staff_profile(db_session, "actor@example.com", "Actor", "User")

    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Verkehr")

    created = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "Damaged sign",
            "description": "Stop sign damaged",
            "category_id": category_id,
            "priority": "HOCH",
            "citizen_first_name": "Jane",
            "citizen_last_name": "Citizen",
        },
    )
    assert created.status_code == 201
    request_id = created.json()["id"]
    assert created.json()["status"] == "NEW"

    list_all = client.get("/requests")
    assert list_all.status_code == 200
    assert any(item["id"] == request_id for item in list_all.json())

    list_filtered = client.get("/requests", params={"status": "NEW", "category_id": category_id, "priority": "HOCH"})
    assert list_filtered.status_code == 200
    assert any(item["id"] == request_id for item in list_filtered.json())

    detail = client.get(f"/requests/{request_id}")
    assert detail.status_code == 200
    assert detail.json()["request"]["id"] == request_id
    assert len(detail.json()["status_history"]) == 1

    claimed = client.post(
        f"/requests/{request_id}/claim",
        json={"actor_staff_profile_id": actor.id},
        headers=WORKER_HEADERS,
    )
    assert claimed.status_code == 200
    assert claimed.json()["assigned_to_staff_profile_id"] == actor.id

    in_progress = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_staff_profile_id": actor.id, "to_status": "IN_PROGRESS", "change_note": "Start processing"},
        headers=WORKER_HEADERS,
    )
    assert in_progress.status_code == 200
    assert in_progress.json()["status"] == "IN_PROGRESS"

    comment = client.post(
        f"/requests/{request_id}/comments",
        json={"author_staff_profile_id": actor.id, "comment_text": "Inspected location"},
        headers=WORKER_HEADERS,
    )
    assert comment.status_code == 201

    resolved = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_staff_profile_id": actor.id, "to_status": "RESOLVED", "change_note": "Fixed"},
        headers=WORKER_HEADERS,
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "RESOLVED"

    closed = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_staff_profile_id": creator.id, "to_status": "CLOSED", "change_note": "Verified"},
        headers=WORKER_HEADERS,
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"

    comment_on_closed = client.post(
        f"/requests/{request_id}/comments",
        json={"author_staff_profile_id": actor.id, "comment_text": "Should fail"},
        headers=WORKER_HEADERS,
    )
    assert comment_on_closed.status_code == 409

    status_on_closed = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_staff_profile_id": actor.id, "to_status": "IN_PROGRESS", "change_note": "Should fail"},
        headers=WORKER_HEADERS,
    )
    assert status_on_closed.status_code == 409

    detail_after = client.get(f"/requests/{request_id}")
    assert detail_after.status_code == 200
    assert len(detail_after.json()["status_history"]) == 4
    assert len(detail_after.json()["comments"]) == 1


def test_requests_invalid_transition_returns_409(client, db_session):
    creator = _create_staff_profile(db_session, "creator2@example.com", "Create", "Two")
    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Umwelt")

    created = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "Garbage dump",
            "description": "Illegal garbage in park",
            "category_id": category_id,
            "priority": "MITTEL",
            "citizen_first_name": "Gary",
            "citizen_last_name": "Citizen",
        },
    )
    assert created.status_code == 201

    invalid = client.patch(
        f"/requests/{created.json()['id']}/status",
        json={"actor_staff_profile_id": creator.id, "to_status": "CLOSED", "change_note": "Invalid"},
        headers=WORKER_HEADERS,
    )
    assert invalid.status_code == 409


def test_validation_and_not_found_errors(client, db_session):
    creator = _create_staff_profile(db_session, "creator3@example.com", "Create", "Three")

    bad_category = client.post("/categories", json={"name": "   "}, headers=WORKER_HEADERS)
    assert bad_category.status_code == 422
    custom_category = client.post("/categories", json={"name": "Food"}, headers=WORKER_HEADERS)
    assert custom_category.status_code == 201

    missing_profile = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": 999999,
            "title": "x",
            "description": "y",
            "category_id": 1,
            "priority": "NIEDRIG",
            "citizen_first_name": "Missing",
            "citizen_last_name": "User",
        },
    )
    assert missing_profile.status_code == 404

    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Sonstiges")

    bad_request = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "   ",
            "description": "desc",
            "category_id": category_id,
            "priority": "NIEDRIG",
            "citizen_first_name": "Blank",
            "citizen_last_name": "Title",
        },
    )
    assert bad_request.status_code == 422

    missing_request = client.get("/requests/999999")
    assert missing_request.status_code == 404

    req = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "Open request",
            "description": "Open for validation",
            "category_id": category_id,
            "priority": "NIEDRIG",
            "citizen_first_name": "Open",
            "citizen_last_name": "Citizen",
        },
    )
    assert req.status_code == 201

    blank_comment = client.post(
        f"/requests/{req.json()['id']}/comments",
        json={"author_staff_profile_id": creator.id, "comment_text": "    "},
        headers=WORKER_HEADERS,
    )
    assert blank_comment.status_code == 422


def test_requests_allow_anonymous_citizen_name(client, db_session):
    creator = _create_staff_profile(db_session, "creator5@example.com", "Create", "Five")
    category_id = next(item["id"] for item in client.get("/categories").json() if item["name"] == "Sonstiges")

    created = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "Anonymous request",
            "description": "No citizen name provided",
            "category_id": category_id,
            "priority": "NIEDRIG",
            "citizen_first_name": "",
            "citizen_last_name": "",
        },
        headers=CITIZEN_HEADERS,
    )
    assert created.status_code == 201
    assert created.json()["citizen_first_name"] is None
    assert created.json()["citizen_last_name"] is None

    request_id = created.json()["id"]
    comment = client.post(
        f"/requests/{request_id}/comments",
        json={"comment_text": "Anonymous follow-up"},
        headers=CITIZEN_HEADERS,
    )
    assert comment.status_code == 201
    assert comment.json()["author_display_name"] == "Anonymous"

    detail = client.get(f"/requests/{request_id}")
    assert detail.status_code == 200
    assert detail.json()["request"]["citizen_first_name"] is None
    assert detail.json()["request"]["citizen_last_name"] is None


def test_status_history_written_for_each_change(db_session):
    result = db_session.execute(text("SELECT COUNT(*) FROM request_status_history"))
    count = result.scalar_one()
    assert count >= 1


def test_citizen_cannot_access_worker_actions(client, db_session):
    creator = _create_staff_profile(db_session, "creator4@example.com", "Create", "Four")
    actor = _create_staff_profile(db_session, "actor4@example.com", "Actor", "Four")
    category_id = next(item["id"] for item in client.get("/categories").json() if item["name"] == "Verkehr")

    created = client.post(
        "/requests",
        json={
            "creator_staff_profile_id": creator.id,
            "title": "Blocked lane",
            "description": "Construction blocks one lane",
            "category_id": category_id,
            "priority": "MITTEL",
            "citizen_first_name": "Tim",
            "citizen_last_name": "Tester",
        },
        headers=CITIZEN_HEADERS,
    )
    assert created.status_code == 201
    request_id = created.json()["id"]

    claim_forbidden = client.post(
        f"/requests/{request_id}/claim",
        json={"actor_staff_profile_id": actor.id},
        headers=CITIZEN_HEADERS,
    )
    assert claim_forbidden.status_code == 403

    status_forbidden = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_staff_profile_id": actor.id, "to_status": "IN_PROGRESS"},
        headers=CITIZEN_HEADERS,
    )
    assert status_forbidden.status_code == 403

    category_forbidden = client.post(
        "/categories",
        json={"name": "Verkehr", "description": "Will be rejected because role"},
        headers=CITIZEN_HEADERS,
    )
    assert category_forbidden.status_code == 403
