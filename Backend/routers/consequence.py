"""
Consequence Model endpoints.

Phase 1: downstream cost (Markov-projected dropout-side spend).
Phase 2: metabolic rebound risk + per-cluster trajectory + dropout-timing sensitivity.
Phase 3: payer ROI will be added here as an additional route.
"""

from collections import Counter, defaultdict

from fastapi import APIRouter, HTTPException

from core.mongo import get_db
from schemas.consequence import (
    DownstreamCostCluster,
    DownstreamCostResponse,
    ReboundCluster,
    ReboundRiskResponse,
    ReboundSensitivityCluster,
    ReboundSensitivityScenario,
    ReboundTrajectoryCluster,
    ReboundTrajectoryPoint,
    ReboundTrajectoryScenario,
)

router = APIRouter(prefix="/consequence", tags=["consequence"])


_CLUSTER_LABELS = {
    0: "Low Urgency Dropout Risk",
    1: "Financial Barrier Dropout Risk",
    2: "Low Friction Strong Adherer",
    3: "Moderate Risk Moderate Adherer",
}


@router.get("/downstream-cost", response_model=DownstreamCostResponse)
async def get_downstream_cost() -> DownstreamCostResponse:
    """Aggregate the per-patient Markov projections into a per-cluster view."""
    db = get_db()
    docs = await db.progression_cost.find({}, {"_id": 0}).to_list(length=None)
    if not docs:
        raise HTTPException(
            status_code=503,
            detail="progression_cost collection is empty. Run scripts/migrate_csv_to_mongo.py.",
        )

    by_cluster_acc: dict[int, dict] = {}
    driver_counter: Counter = Counter()
    pop_total_5yr = 0.0
    pop_total_10yr = 0.0

    for d in docs:
        cluster = int(d["cluster"])
        c5 = float(d.get("expected_downstream_cost_5yr") or 0)
        c10 = float(d.get("expected_downstream_cost_10yr") or 0)
        esrd5 = float(d.get("esrd_probability_5yr") or 0)
        cv5 = float(d.get("cv_event_probability_5yr") or 0)

        acc = by_cluster_acc.setdefault(
            cluster,
            {"n": 0, "sum5": 0.0, "sum10": 0.0, "sum_esrd": 0.0, "sum_cv": 0.0},
        )
        acc["n"] += 1
        acc["sum5"] += c5
        acc["sum10"] += c10
        acc["sum_esrd"] += esrd5
        acc["sum_cv"] += cv5

        pop_total_5yr += c5
        pop_total_10yr += c10

        driver = d.get("primary_cost_driver")
        if driver:
            driver_counter[driver] += 1

    total_drivers = sum(driver_counter.values()) or 1
    driver_dist = {k: v / total_drivers for k, v in driver_counter.items()}

    by_cluster = []
    for cluster, acc in sorted(by_cluster_acc.items()):
        n = acc["n"]
        by_cluster.append(
            DownstreamCostCluster(
                cluster_id=cluster,
                cluster_label=_CLUSTER_LABELS.get(cluster),
                n_patients=n,
                avg_downstream_cost_5yr=round(acc["sum5"] / n, 2),
                avg_downstream_cost_10yr=round(acc["sum10"] / n, 2),
                esrd_probability_5yr=round(acc["sum_esrd"] / n, 5),
                cv_event_probability_5yr=round(acc["sum_cv"] / n, 5),
                total_population_cost_5yr=round(acc["sum5"], 2),
            )
        )

    return DownstreamCostResponse(
        by_cluster=by_cluster,
        population_total_5yr=round(pop_total_5yr, 2),
        population_total_10yr=round(pop_total_10yr, 2),
        primary_cost_driver_distribution={
            k: round(v, 4) for k, v in driver_dist.items()
        },
        n_patients_total=sum(c.n_patients for c in by_cluster),
    )


@router.get("/rebound-risk", response_model=ReboundRiskResponse)
async def get_rebound_risk() -> ReboundRiskResponse:
    """Per-cluster rebound severity + trajectory + dropout-timing sensitivity.

    Reads three Mongo collections:
        rebound_risk          per-patient projection (aggregated here)
        rebound_trajectory    cluster x scenario x month points (line chart)
        rebound_sensitivity   cluster x scenario summary (sensitivity panel)
    """
    db = get_db()
    patient_docs = await db.rebound_risk.find({}, {"_id": 0}).to_list(length=None)
    if not patient_docs:
        raise HTTPException(
            status_code=503,
            detail="rebound_risk collection is empty. Run scripts/migrate_csv_to_mongo.py.",
        )

    traj_docs = await db.rebound_trajectory.find({}, {"_id": 0}).to_list(length=None)
    sens_docs = await db.rebound_sensitivity.find({}, {"_id": 0}).to_list(length=None)

    # ── aggregate per-cluster summary from per-patient rows ───────────────
    cluster_acc: dict[int, dict] = defaultdict(lambda: {
        "n": 0,
        "sum_hba1c_drop": 0.0,
        "sum_hba1c_6":    0.0,
        "sum_hba1c_12":   0.0,
        "sum_bmi_drop":   0.0,
        "sum_bmi_12":     0.0,
        "sum_severity":   0.0,
        "sum_p_t2d":      0.0,
        "n_p_t2d":        0,
        "sum_p_unc":      0.0,
        "n_p_unc":        0,
        "status":         Counter(),
    })

    for d in patient_docs:
        c = int(d["cluster"])
        a = cluster_acc[c]
        a["n"] += 1
        a["sum_hba1c_drop"] += float(d.get("hba1c_at_dropout") or 0)
        a["sum_hba1c_6"]    += float(d.get("expected_hba1c_6mo") or 0)
        a["sum_hba1c_12"]   += float(d.get("expected_hba1c_12mo") or 0)
        a["sum_bmi_drop"]   += float(d.get("bmi_at_dropout") or 0)
        a["sum_bmi_12"]     += float(d.get("expected_bmi_12mo") or 0)
        a["sum_severity"]   += float(d.get("rebound_severity_score") or 0)
        p_t2d = d.get("p_new_t2d_12mo")
        if p_t2d is not None:
            a["sum_p_t2d"] += float(p_t2d)
            a["n_p_t2d"] += 1
        p_unc = d.get("p_uncontrolled_12mo")
        if p_unc is not None:
            a["sum_p_unc"] += float(p_unc)
            a["n_p_unc"] += 1
        status = d.get("dm_status_at_dropout")
        if status:
            a["status"][status] += 1

    by_cluster = []
    for c, a in sorted(cluster_acc.items()):
        n = a["n"]
        total_status = sum(a["status"].values()) or 1
        by_cluster.append(ReboundCluster(
            cluster_id=c,
            cluster_label=_CLUSTER_LABELS.get(c),
            n_patients=n,
            avg_hba1c_at_dropout=round(a["sum_hba1c_drop"] / n, 3),
            avg_expected_hba1c_6mo=round(a["sum_hba1c_6"] / n, 3),
            avg_expected_hba1c_12mo=round(a["sum_hba1c_12"] / n, 3),
            avg_bmi_at_dropout=round(a["sum_bmi_drop"] / n, 2),
            avg_expected_bmi_12mo=round(a["sum_bmi_12"] / n, 2),
            avg_severity_score=round(a["sum_severity"] / n, 4),
            p_new_t2d_12mo_mean=round(a["sum_p_t2d"] / a["n_p_t2d"], 4) if a["n_p_t2d"] else None,
            p_uncontrolled_12mo_mean=round(a["sum_p_unc"] / a["n_p_unc"], 4) if a["n_p_unc"] else None,
            dm_status_distribution={
                k: round(v / total_status, 4) for k, v in a["status"].items()
            },
        ))

    # ── trajectory: group by (cluster, scenario) ──────────────────────────
    traj_by_cluster: dict[int, dict[str, dict]] = defaultdict(dict)
    for row in traj_docs:
        c = int(row["cluster"])
        s = str(row["scenario"])
        if s not in traj_by_cluster[c]:
            traj_by_cluster[c][s] = {
                "dropout_day": float(row["dropout_day"]),
                "points": [],
            }
        traj_by_cluster[c][s]["points"].append(ReboundTrajectoryPoint(
            month=float(row["month"]),
            avg_hba1c=float(row["avg_hba1c"]),
            avg_bmi=float(row["avg_bmi"]),
        ))
    trajectory = []
    for c in sorted(traj_by_cluster):
        scenarios = []
        for s_name in ("early", "median", "late"):
            if s_name not in traj_by_cluster[c]:
                continue
            payload = traj_by_cluster[c][s_name]
            scenarios.append(ReboundTrajectoryScenario(
                scenario=s_name,
                dropout_day=payload["dropout_day"],
                points=sorted(payload["points"], key=lambda p: p.month),
            ))
        trajectory.append(ReboundTrajectoryCluster(cluster_id=c, scenarios=scenarios))

    # ── sensitivity: group by cluster ─────────────────────────────────────
    sens_by_cluster: dict[int, list[ReboundSensitivityScenario]] = defaultdict(list)
    for row in sens_docs:
        c = int(row["cluster"])
        sens_by_cluster[c].append(ReboundSensitivityScenario(
            scenario=str(row["scenario"]),
            dropout_day=float(row["dropout_day"]),
            avg_hba1c_at_dropout=float(row["avg_hba1c_at_dropout"]),
            avg_expected_hba1c_12mo=float(row["avg_expected_hba1c_12mo"]),
            avg_severity_score=float(row["avg_severity_score"]),
            p_new_t2d_12mo_mean=row.get("p_new_t2d_12mo_mean"),
            p_uncontrolled_12mo_mean=row.get("p_uncontrolled_12mo_mean"),
        ))
    sensitivity = []
    for c in sorted(sens_by_cluster):
        ordering = {"early": 0, "median": 1, "late": 2}
        ordered = sorted(sens_by_cluster[c], key=lambda s: ordering.get(s.scenario, 9))
        sensitivity.append(ReboundSensitivityCluster(cluster_id=c, scenarios=ordered))

    # ── population-level T2D incidence: weighted across pre-DM patients ────
    pop_t2d_sum = sum(a["sum_p_t2d"] for a in cluster_acc.values())
    pop_t2d_n = sum(a["n_p_t2d"] for a in cluster_acc.values())
    pop_t2d_incidence = (pop_t2d_sum / pop_t2d_n) if pop_t2d_n > 0 else 0.0

    return ReboundRiskResponse(
        by_cluster=by_cluster,
        trajectory_by_cluster=trajectory,
        sensitivity=sensitivity,
        population_t2d_incidence_12mo=round(pop_t2d_incidence, 4),
        n_patients_total=sum(c.n_patients for c in by_cluster),
    )
