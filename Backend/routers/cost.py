from fastapi import APIRouter
import core.model as model

router = APIRouter()


@router.get("/cost-effectiveness")
def get_cost_effectiveness():
    return model.cost_cache
