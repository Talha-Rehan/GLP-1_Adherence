from fastapi import APIRouter, HTTPException
import numpy as np
import core.loader as loader
import core.model as model

router = APIRouter()


@router.get("/segments")
def get_segments():
    return {"segments": model.segments_cache}


@router.get("/segments/{cluster_id}")
def get_segment(cluster_id: int):
    if cluster_id not in range(4):
        raise HTTPException(status_code=404, detail=f"Segment {cluster_id} not found. Valid: 0–3")

    segs = model.segments_cache or []
    profile = next((s for s in segs if s.get("cluster") == cluster_id), None)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Segment {cluster_id} data not available")

    distributions = _get_distributions(cluster_id)
    return {"cluster": cluster_id, "profile": profile, "distributions": distributions}


def _get_distributions(cluster_id: int):
    df = loader.df_main
    if df is None or "cluster" not in df.columns:
        return None

    sub = df[df["cluster"] == cluster_id]
    if sub.empty:
        return None

    dist = {}
    for col, key in [("BMXBMI", "bmi"), ("RIDAGEYR", "age"), ("LBXGH", "hba1c")]:
        if col not in sub.columns:
            continue
        vals = sub[col].dropna()
        if vals.empty:
            continue
        dist[key] = {
            "mean": round(float(vals.mean()), 2),
            "std":  round(float(vals.std()), 2),
            "min":  round(float(vals.min()), 2),
            "p25":  round(float(np.percentile(vals, 25)), 2),
            "p75":  round(float(np.percentile(vals, 75)), 2),
            "max":  round(float(vals.max()), 2),
        }
    return dist or None
