"""
Loads all data files once at application startup into module-level variables.
Each file is loaded independently so missing files don't block others.
"""

import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from typing import Optional

from core.config import settings

# ── Module-level state populated by load_all() ────────────────────────────────
df_main:     Optional[pd.DataFrame] = None   # GLP1_FINAL_WITH_SURVIVAL.csv
df_shap:     Optional[pd.DataFrame] = None   # shap_patient_drivers.csv
df_segments: Optional[pd.DataFrame] = None   # segment_profiles.csv
df_survival: Optional[pd.DataFrame] = None   # survival_checkpoints.csv
df_cea:      Optional[pd.DataFrame] = None   # cost_effectiveness.csv
df_icer:     Optional[pd.DataFrame] = None   # icer_by_segment.csv
df_budget:   Optional[pd.DataFrame] = None   # budget_impact.csv
shap_values: Optional[np.ndarray]   = None   # shap_values_test.npy
model_pkg:   Optional[dict]         = None   # final_gb_model.pkl


def _try_csv(path: Path, name: str) -> Optional[pd.DataFrame]:
    try:
        df = pd.read_csv(path)
        print(f"  ✅  {name} — {len(df):,} rows")
        return df
    except FileNotFoundError:
        print(f"  ⚠️   {name} not found — add to data/ when ready")
        return None
    except Exception as exc:
        print(f"  ❌  {name} failed: {exc}")
        return None


def load_all() -> None:
    global df_main, df_shap, df_segments, df_survival
    global df_cea, df_icer, df_budget, shap_values, model_pkg

    d = Path(settings.data_dir)
    d.mkdir(parents=True, exist_ok=True)
    print("\n📂  Loading data files…")

    df_main     = _try_csv(d / "GLP1_FINAL_WITH_SURVIVAL.csv", "GLP1_FINAL_WITH_SURVIVAL")
    df_shap     = _try_csv(d / "shap_patient_drivers.csv",     "shap_patient_drivers")
    df_segments = _try_csv(d / "segment_profiles.csv",         "segment_profiles")
    df_survival = _try_csv(d / "survival_checkpoints.csv",     "survival_checkpoints")
    df_cea      = _try_csv(d / "cost_effectiveness.csv",       "cost_effectiveness")
    df_icer     = _try_csv(d / "icer_by_segment.csv",          "icer_by_segment")
    df_budget   = _try_csv(d / "budget_impact.csv",            "budget_impact")

    npy_path = d / "shap_values_test.npy"
    try:
        shap_values = np.load(npy_path)
        print(f"  ✅  shap_values_test — shape {shap_values.shape}")
    except FileNotFoundError:
        print("  ⚠️   shap_values_test.npy not found — global SHAP will use fallback")
    except Exception as exc:
        print(f"  ❌  shap_values_test.npy failed: {exc}")

    pkl_path = d / "final_gb_model.pkl"
    try:
        with open(pkl_path, "rb") as fh:
            model_pkg = pickle.load(fh)
        threshold = model_pkg.get("threshold", "N/A") if isinstance(model_pkg, dict) else "N/A"
        print(f"  ✅  final_gb_model — threshold: {threshold}")
    except FileNotFoundError:
        print("  ⚠️   final_gb_model.pkl not found — model info will use defaults")
    except (ModuleNotFoundError, ImportError) as exc:
        print(f"  ⚠️   final_gb_model.pkl: scikit-learn version mismatch ({exc})")
        print("       Fix: retrain the model in Model/model.ipynb with your current sklearn,")
        print("       or pin scikit-learn in requirements.txt to the version used for training.")
        print("       All CSV-based endpoints are unaffected.")
    except Exception as exc:
        print(f"  ❌  final_gb_model.pkl failed: {exc}")

    loaded = sum(1 for x in [df_main, df_shap, df_segments, df_survival, df_cea] if x is not None)
    print(f"\n  📊  {loaded}/5 primary datasets ready\n")
