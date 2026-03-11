from typing import Literal

from fastapi import Header, HTTPException, status

ActorRole = Literal["citizen", "worker"]


def get_actor_role(x_actor_role: str = Header(default="citizen")) -> ActorRole:
    normalized = x_actor_role.strip().lower()
    if normalized not in {"citizen", "worker"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ungueltiger X-Actor-Role Header. Verwenden Sie 'citizen' oder 'worker'.",
        )
    return normalized  # type: ignore[return-value]


def require_worker(x_actor_role: str = Header(default="citizen")) -> None:
    normalized = x_actor_role.strip().lower()
    if normalized not in {"citizen", "worker"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ungueltiger X-Actor-Role Header. Verwenden Sie 'citizen' oder 'worker'.",
        )
    if normalized != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fuer diese Aktion ist die Rolle 'worker' erforderlich.",
        )
