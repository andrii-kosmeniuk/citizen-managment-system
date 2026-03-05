from fastapi import FastAPI

from app.api.routes import categories_router, health_router, requests_router

app = FastAPI(title="Citizen Request System API", version="0.1.0")

app.include_router(health_router)
app.include_router(categories_router)
app.include_router(requests_router)
