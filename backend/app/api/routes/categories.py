from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_worker
from app.core.logging import get_logger
from app.db.models.category import Category
from app.db.session import get_db
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])
logger = get_logger(__name__)


@router.get("", response_model=list[CategoryRead])
def list_categories(active_only: bool = Query(default=False), db: Session = Depends(get_db)) -> list[Category]:
    stmt = select(Category)
    if active_only:
        stmt = stmt.where(Category.is_active.is_(True))
    return list(db.scalars(stmt).all())


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_worker),
) -> Category:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name must not be blank")
    category = Category(name=name, description=payload.description)
    db.add(category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category name must be unique") from exc
    db.refresh(category)
    logger.info("category_created category_id=%s", category.id)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db), _: None = Depends(require_worker)
) -> Category:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="name must not be blank")
        category.name = name
    if payload.description is not None:
        category.description = payload.description
    if payload.is_active is not None:
        category.is_active = payload.is_active

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category name must be unique") from exc
    db.refresh(category)
    logger.info("category_updated category_id=%s", category_id)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_category(category_id: int, db: Session = Depends(get_db), _: None = Depends(require_worker)) -> None:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.is_active = False
    db.commit()
    logger.info("category_deactivated category_id=%s", category_id)
