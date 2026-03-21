from fastapi import APIRouter

from app.routers.admin.groups import router as groups_router
from app.routers.admin.monitoring import router as monitoring_router
from app.routers.admin.pipeline import router as pipeline_router
from app.routers.admin.reports import router as reports_router
from app.routers.admin.users import router as users_router

router = APIRouter()
router.include_router(pipeline_router)
router.include_router(monitoring_router)
router.include_router(groups_router)
router.include_router(reports_router)
router.include_router(users_router)
