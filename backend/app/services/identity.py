from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.citizen_profile import CitizenProfile
from app.db.models.person import Person
from app.db.models.person_role import PersonRole
from app.db.models.role import Role


def _ensure_role(db: Session, code: str) -> Role:
    role = db.scalar(select(Role).where(Role.code == code))
    if role is None:
        role = Role(code=code, description=f"Autocreated role {code}", is_active=True)
        db.add(role)
        db.flush()
    return role


def _ensure_person_role(db: Session, person_id: int, role_code: str) -> None:
    role = _ensure_role(db, role_code)
    existing = db.scalar(
        select(PersonRole).where(PersonRole.person_id == person_id, PersonRole.role_id == role.id)
    )
    if existing is None:
        db.add(PersonRole(person_id=person_id, role_id=role.id))


def ensure_citizen_person(db: Session, first_name: str, last_name: str) -> Person:
    first = first_name.strip()
    last = last_name.strip()

    person = db.scalar(
        select(Person)
        .join(CitizenProfile, CitizenProfile.person_id == Person.id)
        .where(Person.first_name == first, Person.last_name == last)
        .order_by(Person.id.asc())
    )
    if person is None:
        person = Person(first_name=first, last_name=last, email=None, is_active=True)
        db.add(person)
        db.flush()
        db.add(CitizenProfile(person_id=person.id))

    _ensure_person_role(db, person.id, "CITIZEN")
    return person
