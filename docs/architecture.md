# Architecture Overview

## Layers
- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL

## Separation
- `frontend/` only UI/API calls
- `backend/app/api/` HTTP routes
- `backend/app/services/` business logic
- `backend/app/db/models/` persistence model
