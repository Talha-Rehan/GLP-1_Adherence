"""
All startup-computed caches live here.
init_all_caches() is called once from main.py lifespan after load_all().
Routers import the cache variables directly.
"""

import numpy as np
from typing import Optional, List, Dict, Any

import core.loader as loader

# ── Application-wide constants ────────────────────────────────────────────────
SEGMENT_COLORS = ["#EF5350", "#FF7043", "#43A047", "#1E88E5"]
SEGMENT_LABELS = [
    "Low Urgency Dropout Risk",
    "Financial Barrier Dropout Risk",
    "Low Friction Strong Adherer",
    "Moderate Risk Moderate Adherer",
]
SEGMENT_SHORT = [
    "Low Urgency Dropout",
    "Financial Barrier Dropout",
    "Low Friction Adherer",
    "Moderate Risk Adherer",
]
FEATURE_LABELS: Dict[str, str] = {
    "system_refill_score":  "Provider & pharmacy refill reliability",
    "income_cost_pressure": "Financial pressure relative to income",
    "LBXGH":                "Blood sugar control (HbA1c)",
    "BMXBMI":               "Body weight / BMI severity",
    "comorbidity_score":    "Overall disease burden",
    "drug_generation":      "Drug generation (newer = higher barriers)",
    "RIDAGEYR":             "Patient age",
    "bio_friction":         "Side effect intensity (GI friction)",
    "avg_oop_cost":         "Out-of-pocket medication cost",
    "gender_female":        "Gender (female)",
    "has_diabetes":         "Diagnosed with diabetes",
    "has_obesity":          "Diagnosed with obesity",
    "has_hypertension":     "Diagnosed with hypertension",
    "BPXSY1":               "Systolic blood pressure",
    "LBXTC":                "Total cholesterol",
    "LBXTR":                "Triglycerides",
    "LBXGLU":               "Fasting blood glucose",
}

# ── Computed caches ───────────────────────────────────────────────────────────
summary_cache:  Optional[Dict]       = None
segments_cache: Optional[List[Dict]] = None
survival_cache: Optional[Dict]       = None
cost_cache:     Optional[Dict]       = None
shap_cache:     Optional[List[Dict]] = None


# ── Summary ───────────────────────────────────────────────────────────────────
def _build_summary() -> Dict:
    df = loader.df_main

    # Fallback values matching mockData
    kpis = {
        "total_patients":    7566,
        "adherence_rate":    0.47,
        "dropout_rate":      0.53,
        "avg_annual_cost":   10603,
        "wasted_spend_annual": 40069863,
    }
    adherence_by_segment = [
        {"cluster": 0, "segment": "Low Urgency Dropout",   "adherence": 0.208, "n": 1902, "color": "#EF5350"},
        {"cluster": 1, "segment": "Financial Barrier",     "adherence": 0.309, "n": 2104, "color": "#FF7043"},
        {"cluster": 2, "segment": "Low Friction Adherer",  "adherence": 0.854, "n": 2383, "color": "#43A047"},
        {"cluster": 3, "segment": "Moderate Risk",         "adherence": 0.406, "n": 1177, "color": "#1E88E5"},
    ]
    dropout_by_window = [
        {"window": "By Day 30",  "seg0": 356,  "seg1": 303,  "seg2": 11,  "seg3": 100},
        {"window": "By Day 60",  "seg0": 645,  "seg1": 490,  "seg2": 18,  "seg3": 179},
        {"window": "By Day 90",  "seg0": 827,  "seg1": 655,  "seg2": 26,  "seg3": 246},
        {"window": "By Day 180", "seg0": 1507, "seg1": 1455, "seg2": 349, "seg3": 699},
    ]

    if df is None:
        return {"kpis": kpis, "adherence_by_segment": adherence_by_segment, "dropout_by_window": dropout_by_window}

    adh_col = "is_adherent"
    has_adh = adh_col in df.columns

    adh_rate  = float(df[adh_col].mean()) if has_adh else 0.47
    avg_cost  = float(df["annual_drug_cost"].mean()) if "annual_drug_cost" in df.columns else 10603
    wasted    = float((df["annual_drug_cost"] * (1 - df[adh_col])).sum()) \
                if ("annual_drug_cost" in df.columns and has_adh) else 40069863

    kpis = {
        "total_patients":      len(df),
        "adherence_rate":      round(adh_rate, 4),
        "dropout_rate":        round(1 - adh_rate, 4),
        "avg_annual_cost":     round(avg_cost),
        "wasted_spend_annual": round(wasted),
    }

    if "cluster" in df.columns and has_adh:
        adherence_by_segment = []
        for i in range(4):
            sub = df[df["cluster"] == i]
            adherence_by_segment.append({
                "cluster":   i,
                "segment":   SEGMENT_SHORT[i],
                "adherence": round(float(sub[adh_col].mean()), 4) if not sub.empty else 0.0,
                "n":         len(sub),
                "color":     SEGMENT_COLORS[i],
            })

    if all(c in df.columns for c in ["cluster", "time_to_dropout", "event_occurred"]):
        dropout_by_window = []
        for window, days in [("By Day 30", 30), ("By Day 60", 60), ("By Day 90", 90), ("By Day 180", 180)]:
            row: Dict[str, Any] = {"window": window}
            for i in range(4):
                count = len(df[(df["cluster"] == i) & (df["event_occurred"] == 1) & (df["time_to_dropout"] <= days)])
                row[f"seg{i}"] = count
            dropout_by_window.append(row)

    return {"kpis": kpis, "adherence_by_segment": adherence_by_segment, "dropout_by_window": dropout_by_window}


# ── Segment profiles ──────────────────────────────────────────────────────────
_SEGMENT_FALLBACK = [
    {"cluster": 0, "label": SEGMENT_LABELS[0], "short": SEGMENT_SHORT[0], "n": 1902, "adherence": 0.208,
     "age": 45.0, "bmi": 35.9, "hba1c": 5.35, "oop_cost": 40.51, "cost_pressure": 25.4,
     "bio_friction": 0.566, "refill_score": 1.19, "comorbidity": 0.30,
     "wasted_per_pt": 8412, "cost_per_hba1c": 25311, "cost_per_weight": 2806},
    {"cluster": 1, "label": SEGMENT_LABELS[1], "short": SEGMENT_SHORT[1], "n": 2104, "adherence": 0.309,
     "age": 58.8, "bmi": 33.6, "hba1c": 6.77, "oop_cost": 50.90, "cost_pressure": 31.3,
     "bio_friction": 0.566, "refill_score": 1.21, "comorbidity": 1.34,
     "wasted_per_pt": 7246, "cost_per_hba1c": 16970, "cost_per_weight": 1901},
    {"cluster": 2, "label": SEGMENT_LABELS[2], "short": SEGMENT_SHORT[2], "n": 2383, "adherence": 0.854,
     "age": 55.3, "bmi": 34.7, "hba1c": 6.20, "oop_cost": 83.01, "cost_pressure": 47.7,
     "bio_friction": 0.244, "refill_score": 0.97, "comorbidity": 0.92,
     "wasted_per_pt": 1574, "cost_per_hba1c": 8827, "cost_per_weight": 914},
    {"cluster": 3, "label": SEGMENT_LABELS[3], "short": SEGMENT_SHORT[3], "n": 1177, "adherence": 0.406,
     "age": 59.5, "bmi": 34.2, "hba1c": 6.55, "oop_cost": 41.06, "cost_pressure": 23.7,
     "bio_friction": 0.566, "refill_score": 1.16, "comorbidity": 1.31,
     "wasted_per_pt": 6260, "cost_per_hba1c": 13643, "cost_per_weight": 1573},
]


def _build_segments() -> List[Dict]:
    df_seg = loader.df_segments
    df_main = loader.df_main

    if df_seg is not None:
        # Map CSV columns to expected shape
        results = []
        col_map = {
            "cluster": "cluster", "label": "label", "short": "short",
            "n": "n", "adherence_rate": "adherence", "adherence": "adherence",
            "avg_age": "age", "age": "age",
            "avg_bmi": "bmi", "bmi": "bmi",
            "avg_hba1c": "hba1c", "hba1c": "hba1c",
            "avg_oop_cost": "oop_cost", "oop_cost": "oop_cost",
            "cost_pressure": "cost_pressure", "avg_cost_pressure": "cost_pressure",
            "bio_friction": "bio_friction", "avg_bio_friction": "bio_friction",
            "system_refill_score": "refill_score", "refill_score": "refill_score",
            "comorbidity_score": "comorbidity", "comorbidity": "comorbidity",
            "wasted_per_pt": "wasted_per_pt",
            "cost_per_hba1c": "cost_per_hba1c",
            "cost_per_weight": "cost_per_weight",
        }
        for _, row in df_seg.iterrows():
            seg: Dict[str, Any] = {}
            for csv_col, out_key in col_map.items():
                if csv_col in row and out_key not in seg:
                    val = row[csv_col]
                    seg[out_key] = None if (hasattr(val, "__float__") and np.isnan(float(val))) else val
            # Ensure required fields
            i = int(seg.get("cluster", 0))
            seg.setdefault("label", SEGMENT_LABELS[i] if i < len(SEGMENT_LABELS) else f"Segment {i}")
            seg.setdefault("short", SEGMENT_SHORT[i] if i < len(SEGMENT_SHORT) else f"Segment {i}")
            seg.setdefault("adherence", _SEGMENT_FALLBACK[i]["adherence"] if i < len(_SEGMENT_FALLBACK) else 0.5)
            results.append(seg)
        return results

    if df_main is not None and "cluster" in df_main.columns:
        results = []
        for i in range(4):
            sub = df_main[df_main["cluster"] == i]
            if sub.empty:
                results.append(_SEGMENT_FALLBACK[i])
                continue
            adh = float(sub["is_adherent"].mean()) if "is_adherent" in sub.columns else _SEGMENT_FALLBACK[i]["adherence"]
            cost = float(sub["annual_drug_cost"].mean()) if "annual_drug_cost" in sub.columns else 10603
            wasted_per_pt = round(cost * (1 - adh))
            results.append({
                "cluster":      i,
                "label":        SEGMENT_LABELS[i],
                "short":        SEGMENT_SHORT[i],
                "n":            len(sub),
                "adherence":    round(adh, 4),
                "age":          round(float(sub["RIDAGEYR"].mean()), 1) if "RIDAGEYR" in sub.columns else _SEGMENT_FALLBACK[i]["age"],
                "bmi":          round(float(sub["BMXBMI"].mean()), 1) if "BMXBMI" in sub.columns else _SEGMENT_FALLBACK[i]["bmi"],
                "hba1c":        round(float(sub["LBXGH"].mean()), 2) if "LBXGH" in sub.columns else _SEGMENT_FALLBACK[i]["hba1c"],
                "oop_cost":     round(float(sub["avg_oop_cost"].mean()), 2) if "avg_oop_cost" in sub.columns else _SEGMENT_FALLBACK[i]["oop_cost"],
                "cost_pressure":round(float(sub["income_cost_pressure"].mean()), 1) if "income_cost_pressure" in sub.columns else _SEGMENT_FALLBACK[i]["cost_pressure"],
                "bio_friction": round(float(sub["bio_friction"].mean()), 3) if "bio_friction" in sub.columns else _SEGMENT_FALLBACK[i]["bio_friction"],
                "refill_score": round(float(sub["system_refill_score"].mean()), 4) if "system_refill_score" in sub.columns else _SEGMENT_FALLBACK[i]["refill_score"],
                "comorbidity":  round(float(sub["comorbidity_score"].mean()), 2) if "comorbidity_score" in sub.columns else _SEGMENT_FALLBACK[i]["comorbidity"],
                "wasted_per_pt":    wasted_per_pt,
                "cost_per_hba1c":   _SEGMENT_FALLBACK[i]["cost_per_hba1c"],
                "cost_per_weight":  _SEGMENT_FALLBACK[i]["cost_per_weight"],
            })
        return results

    return _SEGMENT_FALLBACK


# ── Survival curves ───────────────────────────────────────────────────────────
def _build_survival() -> Dict:
    checkpoints_fallback = [
        {"segment": SEGMENT_LABELS[0], "cluster": 0, "day30": 0.187, "day60": 0.339, "day90": 0.434, "day180": 0.792},
        {"segment": SEGMENT_LABELS[1], "cluster": 1, "day30": 0.144, "day60": 0.233, "day90": 0.312, "day180": 0.692},
        {"segment": SEGMENT_LABELS[2], "cluster": 2, "day30": 0.005, "day60": 0.008, "day90": 0.011, "day180": 0.146},
        {"segment": SEGMENT_LABELS[3], "cluster": 3, "day30": 0.085, "day60": 0.152, "day90": 0.209, "day180": 0.594},
    ]
    median_fallback = [112, 179, 999, 179]

    # Try lifelines first
    curves = _fit_km_curves()
    checkpoints = _load_checkpoints() or checkpoints_fallback

    # Compute median from curves
    median_survival = []
    for sc in curves:
        med = 999
        for pt in sc["data"]:
            if pt["survival"] <= 0.5:
                med = pt["day"]
                break
        median_survival.append(med)

    return {
        "curves":          curves,
        "checkpoints":     checkpoints,
        "median_survival": median_survival,
        "logrank":         {"test_statistic": 2354.82, "p_value": 0.0, "significant": True},
    }


def _fit_km_curves() -> List[Dict]:
    _DEFAULT_ADH = [0.208, 0.309, 0.854, 0.406]
    df = loader.df_main
    segs = _build_segments() if segments_cache is None else segments_cache
    adh_by_cluster = {int(s.get("cluster", i)): s.get("adherence", _DEFAULT_ADH[i] if i < len(_DEFAULT_ADH) else 0.5)
                      for i, s in enumerate(segs)}
    adherence_rates = [adh_by_cluster.get(i, _DEFAULT_ADH[i]) for i in range(4)]

    if df is not None and all(c in df.columns for c in ["cluster", "time_to_dropout", "event_occurred"]):
        try:
            from lifelines import KaplanMeierFitter
            curves = []
            for i in range(4):
                sub = df[df["cluster"] == i]
                if sub.empty:
                    continue
                kmf = KaplanMeierFitter()
                kmf.fit(sub["time_to_dropout"], event_observed=sub["event_occurred"])
                timeline = list(range(0, 181, 5))
                sf = kmf.survival_function_at_times(timeline)
                curves.append({
                    "cluster":   i,
                    "label":     SEGMENT_LABELS[i],
                    "color":     SEGMENT_COLORS[i],
                    "adherence": round(float(sub["is_adherent"].mean()), 4) if "is_adherent" in sub.columns else adherence_rates[i],
                    "data":      [{"day": int(d), "survival": round(float(sf.iloc[j]), 4)} for j, d in enumerate(timeline)],
                })
            print(f"  ✅  KM curves fitted from real data ({len(curves)} segments)")
            return curves
        except ImportError:
            print("  ⚠️  lifelines not installed — using exponential KM approximation")
        except Exception as exc:
            print(f"  ⚠️  KM fitting failed ({exc}) — using approximation")

    # Exponential fallback
    curves = []
    for i in range(4):
        adh = adherence_rates[i] if i < len(adherence_rates) else 0.5
        lam = -np.log(max(adh, 0.001)) / 180
        timeline = list(range(0, 181, 5))
        curves.append({
            "cluster":   i,
            "label":     SEGMENT_LABELS[i],
            "color":     SEGMENT_COLORS[i],
            "adherence": round(adh, 4),
            "data":      [{"day": d, "survival": round(float(np.exp(-lam * d)), 4)} for d in timeline],
        })
    return curves


def _load_checkpoints() -> Optional[List[Dict]]:
    df = loader.df_survival
    if df is None:
        return None

    # Build segment-name → cluster index lookup
    seg_to_cluster = {label.lower(): i for i, label in enumerate(SEGMENT_LABELS)}
    seg_to_cluster.update({short.lower(): i for i, short in enumerate(SEGMENT_SHORT)})

    def _get_day(row, *keys):
        for k in keys:
            if k in row and row[k] is not None:
                try:
                    v = float(row[k])
                    if not np.isnan(v):
                        return round(v, 4)
                except (ValueError, TypeError):
                    pass
        return 0.0

    rows = []
    for _, row in df.iterrows():
        seg_name = str(row.get("segment", ""))
        cluster = int(row.get("cluster", row.get("cluster_id",
                    seg_to_cluster.get(seg_name.lower(), 0))))
        rows.append({
            "segment": seg_name or SEGMENT_LABELS[cluster],
            "cluster": cluster,
            "day30":  _get_day(row, "day30",  "day_30"),
            "day60":  _get_day(row, "day60",  "day_60"),
            "day90":  _get_day(row, "day90",  "day_90"),
            "day180": _get_day(row, "day180", "day_180"),
        })
    return rows


# ── Cost-effectiveness ────────────────────────────────────────────────────────
_CEA_FALLBACK = [
    {"cluster": 0, "label": SEGMENT_SHORT[0], "n": 1902, "annual_cost": 10622,
     "weight_loss": 3.8, "hba1c_reduction": 0.42,
     "cost_per_weight": 2806, "cost_per_hba1c": 25311,
     "icer_insulin_weight": 5622, "icer_insulin_hba1c": 149477,
     "icer_sglt2_weight": 1487, "icer_sglt2_hba1c": 30145},
    {"cluster": 1, "label": SEGMENT_SHORT[1], "n": 2104, "annual_cost": 10474,
     "weight_loss": 5.5, "hba1c_reduction": 0.62,
     "cost_per_weight": 1901, "cost_per_hba1c": 16970,
     "icer_insulin_weight": 3801, "icer_insulin_hba1c": 97612,
     "icer_sglt2_weight": 1006, "icer_sglt2_hba1c": 20425},
    {"cluster": 2, "label": SEGMENT_SHORT[2], "n": 2383, "annual_cost": 10779,
     "weight_loss": 11.8, "hba1c_reduction": 1.22,
     "cost_per_weight": 914, "cost_per_hba1c": 8827,
     "icer_insulin_weight": 679, "icer_insulin_hba1c": 30507,
     "icer_sglt2_weight": 397, "icer_sglt2_hba1c": 8576},
    {"cluster": 3, "label": SEGMENT_SHORT[3], "n": 1177, "annual_cost": 10540,
     "weight_loss": 6.7, "hba1c_reduction": 0.77,
     "cost_per_weight": 1573, "cost_per_hba1c": 13643,
     "icer_insulin_weight": 2805, "icer_insulin_hba1c": 74907,
     "icer_sglt2_weight": 743, "icer_sglt2_hba1c": 16440},
]

_BENCHMARKS = {
    "glp1": {
        "SEMAGLUTIDE": {"weight_loss_pct": 14.9, "hba1c_reduction": 1.6, "annual_cost": 13000},
        "TIRZEPATIDE": {"weight_loss_pct": 20.9, "hba1c_reduction": 2.1, "annual_cost": 16000},
        "LIRAGLUTIDE": {"weight_loss_pct": 8.0,  "hba1c_reduction": 1.1, "annual_cost": 7800},
        "DULAGLUTIDE": {"weight_loss_pct": 4.5,  "hba1c_reduction": 1.4, "annual_cost": 7200},
    },
    "comparators": {
        "insulin_glargine": {"weight_loss_pct": -1.5, "hba1c_reduction": 1.5, "annual_cost": 3500},
        "sglt2_inhibitor":  {"weight_loss_pct":  3.0, "hba1c_reduction": 0.8, "annual_cost": 5800},
    },
    "icer_threshold": 50000,
}


def _build_cost() -> Dict:
    df_cea = loader.df_cea
    df_icer = loader.df_icer

    if df_cea is not None:
        cea = []
        for _, row in df_cea.iterrows():
            i = int(row.get("cluster", 0))
            cea.append({
                "cluster":           i,
                "label":             str(row.get("label", row.get("segment", SEGMENT_SHORT[i]))),
                "n":                 int(row.get("n", _CEA_FALLBACK[i]["n"])),
                "annual_cost":       float(row.get("annual_cost", row.get("avg_annual_cost", _CEA_FALLBACK[i]["annual_cost"]))),
                "weight_loss":       float(row.get("weight_loss", _CEA_FALLBACK[i]["weight_loss"])),
                "hba1c_reduction":   float(row.get("hba1c_reduction", _CEA_FALLBACK[i]["hba1c_reduction"])),
                "cost_per_weight":   float(row.get("cost_per_weight", _CEA_FALLBACK[i]["cost_per_weight"])),
                "cost_per_hba1c":    float(row.get("cost_per_hba1c", _CEA_FALLBACK[i]["cost_per_hba1c"])),
                "icer_insulin_weight":float(row.get("icer_insulin_weight", _CEA_FALLBACK[i]["icer_insulin_weight"])),
                "icer_insulin_hba1c":float(row.get("icer_insulin_hba1c", _CEA_FALLBACK[i]["icer_insulin_hba1c"])),
                "icer_sglt2_weight": float(row.get("icer_sglt2_weight", _CEA_FALLBACK[i]["icer_sglt2_weight"])),
                "icer_sglt2_hba1c":  float(row.get("icer_sglt2_hba1c", _CEA_FALLBACK[i]["icer_sglt2_hba1c"])),
            })
    else:
        cea = _CEA_FALLBACK

    return {"cea": cea, "benchmarks": _BENCHMARKS}


# ── Global SHAP ───────────────────────────────────────────────────────────────
_SHAP_FALLBACK = [
    {"feature": "Provider & pharmacy refill reliability",    "importance": 0.541},
    {"feature": "Financial pressure relative to income",     "importance": 0.162},
    {"feature": "Blood sugar control (HbA1c)",               "importance": 0.081},
    {"feature": "Body weight / BMI severity",                "importance": 0.058},
    {"feature": "Overall disease burden",                    "importance": 0.051},
    {"feature": "Drug generation (newer = higher barriers)", "importance": 0.031},
    {"feature": "Patient age",                               "importance": 0.029},
    {"feature": "Side effect intensity (GI friction)",       "importance": 0.021},
    {"feature": "Out-of-pocket medication cost",             "importance": 0.019},
]


def _build_global_shap() -> List[Dict]:
    shap_vals = loader.shap_values
    model = loader.model_pkg

    if shap_vals is None:
        return _SHAP_FALLBACK

    try:
        mean_abs = np.abs(shap_vals).mean(axis=0)

        if isinstance(model, dict) and "feature_names" in model:
            feature_names = model["feature_names"]
        elif isinstance(model, dict) and "model" in model and hasattr(model["model"], "feature_names_in_"):
            feature_names = list(model["model"].feature_names_in_)
        else:
            feature_names = list(FEATURE_LABELS.keys())[: len(mean_abs)]

        if len(mean_abs) != len(feature_names):
            feature_names = [f"feature_{i}" for i in range(len(mean_abs))]

        drivers = [
            {"feature": FEATURE_LABELS.get(f, f), "importance": round(float(v), 4)}
            for f, v in zip(feature_names, mean_abs)
        ]
        drivers.sort(key=lambda x: x["importance"], reverse=True)
        return drivers

    except Exception as exc:
        print(f"  ⚠️  SHAP global compute failed ({exc}) — using fallback")
        return _SHAP_FALLBACK


# ── Entry point ───────────────────────────────────────────────────────────────
def init_all_caches() -> None:
    global summary_cache, segments_cache, survival_cache, cost_cache, shap_cache
    print("🔄  Building caches…")
    segments_cache = _build_segments()   # needed by survival + budget
    summary_cache  = _build_summary()
    survival_cache = _build_survival()
    cost_cache     = _build_cost()
    shap_cache     = _build_global_shap()

    # Build the merged patients dataframe for the patients router
    from routers.patients import build_patients_cache
    build_patients_cache()

    print("✅  All caches ready\n")
