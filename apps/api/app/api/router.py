from fastapi import APIRouter

from app.api.routes import (
    auth,
    calendars,
    categories,
    contacts,
    conversations,
    events,
    folders,
    groups,
    messages,
    quick_steps,
    rules,
    settings,
    signatures,
    task_lists,
    tasks,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(messages.router)
api_router.include_router(folders.router)
api_router.include_router(conversations.router)
api_router.include_router(contacts.router)
api_router.include_router(calendars.router)
api_router.include_router(events.router)
api_router.include_router(groups.router)
api_router.include_router(tasks.router)
api_router.include_router(task_lists.router)
api_router.include_router(quick_steps.router)
api_router.include_router(rules.router)
api_router.include_router(signatures.router)
api_router.include_router(categories.router)
api_router.include_router(settings.router)
