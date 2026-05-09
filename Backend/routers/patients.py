from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import pandas as pd
import numpy as np

import core.loader as loader
import core.model as model

router = APIRouter()

# ── Merged patient dataframe (built once at cache time) ───────────────────────
_patients_df: Optional[pd.DataFrame] = None


def build_patients_cache() -> None:
    """Called from model.init_all_caches after load_all()."""
    global _patients_df
    df_main = loader.df_main
    df_shap = loader.df_shap

    if df_main is None:
        _patients_df = None
        return

    # Ensure patient_idx exists; if not, use the DataFrame row index
    if "patient_idx" not in df_main.columns:
        df_main = df_main.reset_index(drop=True)
        df_main = df_main.copy()
        df_main.insert(0, "patient_idx", df_main.index)

    if df_shap is not None and "patient_idx" in df_shap.columns:
        _patients_df = df_main.merge(df_shap, on="patient_idx", how="left", suffixes=("", "_shap"))
    else:
        _patients_df = df_main.copy()


def _row_to_dict(row: pd.Series) -> dict:
    """Converts a merged patient row to the API shape."""
    def _safe(col, default=None):
        val = row.get(col, default)
        if val is None:
            return default
        try:
            if isinstance(val, float) and np.isnan(val):
                return default
        except Exception:
            pass
        return val

    cluster = int(_safe("cluster", 0))
    return {
        "patient_idx":          int(_safe("patient_idx", 0)),
        "dropout_prob":         round(float(_safe("dropout_prob", _safe("dropout_proba", 0.5))), 4),
        "prediction":           str(_safe("prediction", "Unknown")),
        "cluster":              cluster,
        "segment":              model.SEGMENT_SHORT[cluster] if cluster < 4 else "Unknown",
        "assigned_molecule":    str(_safe("assigned_molecule", "UNKNOWN")),
        "avg_oop_cost":         round(float(_safe("avg_oop_cost", 0.0)), 2),
        "driver_1":             str(_safe("driver_1", "")),
        "driver_1_direction":   str(_safe("driver_1_direction", "")),
        "driver_1_shap":        _safe("driver_1_shap"),
        "driver_2":             _safe("driver_2"),
        "driver_2_direction":   _safe("driver_2_direction"),
        "driver_2_shap":        _safe("driver_2_shap"),
        "driver_3":             _safe("driver_3"),
        "driver_3_direction":   _safe("driver_3_direction"),
        "driver_3_shap":        _safe("driver_3_shap"),
        "BMXBMI":               _safe("BMXBMI"),
        "RIDAGEYR":             int(_safe("RIDAGEYR")) if _safe("RIDAGEYR") is not None else None,
        "LBXGH":                _safe("LBXGH"),
        "comorbidity_score":    int(_safe("comorbidity_score")) if _safe("comorbidity_score") is not None else None,
        "bio_friction":         _safe("bio_friction"),
        "income_cost_pressure": _safe("income_cost_pressure"),
        "system_refill_score":  _safe("system_refill_score"),
        "drug_generation":      int(_safe("drug_generation")) if _safe("drug_generation") is not None else None,
        "time_to_dropout":      int(_safe("time_to_dropout")) if _safe("time_to_dropout") is not None else None,
    }


def _is_financial(driver: Optional[str]) -> bool:
    if not driver:
        return False
    return any(kw in driver.lower() for kw in ("financial", "out-of-pocket", "cost", "income"))


# ── GET /patients ──────────────────────────────────────────────────────────────
@router.get("/patients")
def get_patients(
    page:        int   = Query(0, ge=0),
    page_size:   int   = Query(20, ge=1, le=10000),
    segment:     Optional[int]   = Query(None),
    molecule:    Optional[str]   = Query(None),
    min_risk:    Optional[float] = Query(None, ge=0.0, le=1.0),
    prediction:  Optional[str]   = Query(None),
    financial_only: bool         = Query(False),
    sort_by:     str             = Query("dropout_prob"),
    sort_dir:    str             = Query("desc"),
    search:      Optional[str]   = Query(None),
):
    df = _patients_df
    if df is None:
        return {"total": 0, "page": page, "page_size": page_size, "patients": [],
                "summary": {"high_risk_count": 0, "financial_barrier_count": 0}}

    mask = pd.Series([True] * len(df), index=df.index)

    if segment is not None and "cluster" in df.columns:
        mask &= df["cluster"] == segment
    if molecule and "assigned_molecule" in df.columns:
        mask &= df["assigned_molecule"].str.upper() == molecule.upper()
    if min_risk is not None and "dropout_prob" in df.columns:
        mask &= df["dropout_prob"] >= min_risk
    if prediction and "prediction" in df.columns:
        mask &= df["prediction"] == prediction
    if financial_only and "driver_1" in df.columns:
        mask &= df["driver_1"].str.lower().str.contains("financial|out-of-pocket|cost|income", na=False)
    if search and "driver_1" in df.columns:
        id_mask  = df["patient_idx"].astype(str).str.contains(search, na=False) if "patient_idx" in df.columns else pd.Series(False, index=df.index)
        drv_mask = df["driver_1"].str.lower().str.contains(search.lower(), na=False)
        mask &= (id_mask | drv_mask)

    filtered = df[mask]

    asc = sort_dir.lower() != "desc"
    if sort_by in filtered.columns:
        filtered = filtered.sort_values(sort_by, ascending=asc)
    elif "dropout_prob" in filtered.columns:
        filtered = filtered.sort_values("dropout_prob", ascending=False)

    total         = len(filtered)
    high_risk     = int((filtered["dropout_prob"] >= 0.75).sum()) if "dropout_prob" in filtered.columns else 0
    financial_cnt = int(filtered["driver_1"].str.lower().str.contains("financial|out-of-pocket|cost|income", na=False).sum()) if "driver_1" in filtered.columns else 0

    page_df = filtered.iloc[page * page_size: (page + 1) * page_size]
    patients = [_row_to_dict(row) for _, row in page_df.iterrows()]

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "patients":  patients,
        "summary":   {"high_risk_count": high_risk, "financial_barrier_count": financial_cnt},
    }


# ── GET /patients/{patient_idx} ───────────────────────────────────────────────
@router.get("/patients/{patient_idx}")
def get_patient(patient_idx: int):
    df = _patients_df
    if df is None:
        raise HTTPException(status_code=503, detail="Patient data not loaded — add CSV files to data/")

    if "patient_idx" not in df.columns:
        raise HTTPException(status_code=503, detail="patient_idx column missing from dataset")

    row_df = df[df["patient_idx"] == patient_idx]
    if row_df.empty:
        raise HTTPException(status_code=404, detail=f"Patient {patient_idx} not found")

    row     = row_df.iloc[0]
    patient = _row_to_dict(row)

    # SHAP drivers
    shap_drivers = None
    if all(c in row.index for c in ["driver_1", "driver_1_direction", "driver_1_shap"]):
        shap_drivers = []
        for rank, (feat_col, dir_col, shap_col) in enumerate([
            ("driver_1", "driver_1_direction", "driver_1_shap"),
            ("driver_2", "driver_2_direction", "driver_2_shap"),
            ("driver_3", "driver_3_direction", "driver_3_shap"),
        ], start=1):
            feat = row.get(feat_col)
            if feat is None or (isinstance(feat, float) and np.isnan(feat)):
                break
            shap_val = row.get(shap_col, 0.0)
            shap_drivers.append({
                "rank":       rank,
                "feature":    str(feat),
                "direction":  str(row.get(dir_col, "")),
                "shap_value": round(float(shap_val) if shap_val is not None else 0.0, 4),
            })

    # Segment survival checkpoints
    cluster   = int(row.get("cluster", 0))
    checkpts  = (model.survival_cache or {}).get("checkpoints", [])
    seg_surv  = next((c for c in checkpts if c.get("cluster") == cluster), None)

    return {
        "patient":          patient,
        "shap_drivers":     shap_drivers,
        "segment_survival": seg_surv,
    }
