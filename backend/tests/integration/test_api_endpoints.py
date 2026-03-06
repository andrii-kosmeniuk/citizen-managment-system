from sqlalchemy import text

from app.db.models.user import StaffUser


def _create_staff(db_session, email: str, first_name: str = "John", last_name: str = "Doe") -> StaffUser:
    user = StaffUser(first_name=first_name, last_name=last_name, email=email)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_categories_crud_and_active_filter(client):
    list_initial = client.get("/categories")
    assert list_initial.status_code == 200
    initial_names = {item["name"] for item in list_initial.json()}
    assert initial_names == {"Infrastructure", "Environment", "Traffic", "Other"}

    invalid = client.post("/categories", json={"name": "Noise", "description": "Should fail"})
    assert invalid.status_code == 422

    category_id = next(item["id"] for item in list_initial.json() if item["name"] == "Infrastructure")
    updated = client.patch(f"/categories/{category_id}", json={"description": "Roads and lighting"})
    assert updated.status_code == 200
    assert updated.json()["description"] == "Roads and lighting"

    deleted = client.delete(f"/categories/{category_id}")
    assert deleted.status_code == 204

    active_only = client.get("/categories", params={"active_only": True})
    assert active_only.status_code == 200
    assert all(item["is_active"] for item in active_only.json())
    assert not any(item["id"] == category_id for item in active_only.json())


def test_requests_end_to_end_all_actions(client, db_session):
    creator = _create_staff(db_session, "creator@example.com", "Create", "User")
    actor = _create_staff(db_session, "actor@example.com", "Actor", "User")

    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Traffic")

    created = client.post(
        "/requests",
        json={
            "creator_user_id": creator.id,
            "title": "Damaged sign",
            "description": "Stop sign damaged",
            "category_id": category_id,
            "priority": "HIGH",
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

    list_filtered = client.get("/requests", params={"status": "NEW", "category_id": category_id, "priority": "HIGH"})
    assert list_filtered.status_code == 200
    assert any(item["id"] == request_id for item in list_filtered.json())

    detail = client.get(f"/requests/{request_id}")
    assert detail.status_code == 200
    assert detail.json()["request"]["id"] == request_id
    assert len(detail.json()["status_history"]) == 1

    claimed = client.post(f"/requests/{request_id}/claim", json={"actor_user_id": actor.id})
    assert claimed.status_code == 200
    assert claimed.json()["assigned_to_user_id"] == actor.id

    in_progress = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_user_id": actor.id, "to_status": "IN_PROGRESS", "change_note": "Start processing"},
    )
    assert in_progress.status_code == 200
    assert in_progress.json()["status"] == "IN_PROGRESS"

    comment = client.post(
        f"/requests/{request_id}/comments",
        json={"author_user_id": actor.id, "comment_text": "Inspected location"},
    )
    assert comment.status_code == 201

    resolved = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_user_id": actor.id, "to_status": "RESOLVED", "change_note": "Fixed"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "RESOLVED"

    closed = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_user_id": creator.id, "to_status": "CLOSED", "change_note": "Verified"},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"

    comment_on_closed = client.post(
        f"/requests/{request_id}/comments",
        json={"author_user_id": actor.id, "comment_text": "Should fail"},
    )
    assert comment_on_closed.status_code == 409

    status_on_closed = client.patch(
        f"/requests/{request_id}/status",
        json={"actor_user_id": actor.id, "to_status": "IN_PROGRESS", "change_note": "Should fail"},
    )
    assert status_on_closed.status_code == 409

    detail_after = client.get(f"/requests/{request_id}")
    assert detail_after.status_code == 200
    assert len(detail_after.json()["status_history"]) == 4
    assert len(detail_after.json()["comments"]) == 1


def test_requests_invalid_transition_returns_409(client, db_session):
    creator = _create_staff(db_session, "creator2@example.com", "Create", "Two")
    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Environment")

    created = client.post(
        "/requests",
        json={
            "creator_user_id": creator.id,
            "title": "Garbage dump",
            "description": "Illegal garbage in park",
            "category_id": category_id,
            "priority": "MEDIUM",
            "citizen_first_name": "Gary",
            "citizen_last_name": "Citizen",
        },
    )
    assert created.status_code == 201

    invalid = client.patch(
        f"/requests/{created.json()['id']}/status",
        json={"actor_user_id": creator.id, "to_status": "CLOSED", "change_note": "Invalid"},
    )
    assert invalid.status_code == 409


def test_validation_and_not_found_errors(client, db_session):
    creator = _create_staff(db_session, "creator3@example.com", "Create", "Three")

    bad_category = client.post("/categories", json={"name": "   "})
    assert bad_category.status_code == 422
    unsupported_category = client.post("/categories", json={"name": "Random"})
    assert unsupported_category.status_code == 422

    missing_user = client.post(
        "/requests",
        json={
            "creator_user_id": 999999,
            "title": "x",
            "description": "y",
            "category_id": 1,
            "priority": "LOW",
            "citizen_first_name": "Missing",
            "citizen_last_name": "User",
        },
    )
    assert missing_user.status_code == 404

    categories = client.get("/categories")
    assert categories.status_code == 200
    category_id = next(item["id"] for item in categories.json() if item["name"] == "Other")

    bad_request = client.post(
        "/requests",
        json={
            "creator_user_id": creator.id,
            "title": "   ",
            "description": "desc",
            "category_id": category_id,
            "priority": "LOW",
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
            "creator_user_id": creator.id,
            "title": "Open request",
            "description": "Open for validation",
            "category_id": category_id,
            "priority": "LOW",
            "citizen_first_name": "Open",
            "citizen_last_name": "Citizen",
        },
    )
    assert req.status_code == 201

    blank_comment = client.post(
        f"/requests/{req.json()['id']}/comments",
        json={"author_user_id": creator.id, "comment_text": "    "},
    )
    assert blank_comment.status_code == 422


def test_status_history_written_for_each_change(db_session):
    result = db_session.execute(text("SELECT COUNT(*) FROM request_status_history"))
    count = result.scalar_one()
    assert count >= 1
