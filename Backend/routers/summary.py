from fastapi import APIRouter
import core.model as model

router = APIRouter()


@router.get("/summary")
def get_summary():
    return model.summary_cache
