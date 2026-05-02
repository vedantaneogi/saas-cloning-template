from fastapi import APIRouter

from app.admin.router import router as admin_router
from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.contacts.router import router as contacts_router
from app.envelopes.router import router as envelopes_router
from app.health.router import router as health_router
from app.signing.router import router as signing_router
from app.templates.router import router as templates_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(envelopes_router)
api_router.include_router(signing_router)
api_router.include_router(audit_router)
api_router.include_router(templates_router)
api_router.include_router(contacts_router)
api_router.include_router(admin_router)
