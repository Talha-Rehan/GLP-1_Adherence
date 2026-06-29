"""Pydantic schemas for the Consequence Model endpoints."""

from typing import Dict, List, Optional

from pydantic import BaseModel


class DownstreamCostCluster(BaseModel):
    cluster_id:                int
    cluster_label:             Optional[str] = None
    n_patients:                int
    avg_downstream_cost_5yr:   float
    avg_downstream_cost_10yr:  float
    esrd_probability_5yr:      float
    cv_event_probability_5yr:  float
    total_population_cost_5yr: float


class DownstreamCostResponse(BaseModel):
    by_cluster:                       List[DownstreamCostCluster]
    population_total_5yr:             float
    population_total_10yr:            float
    primary_cost_driver_distribution: Dict[str, float]
    n_patients_total:                 int


# ── Rebound Risk (Phase 2) ──────────────────────────────────────────────────

class ReboundCluster(BaseModel):
    cluster_id:                int
    cluster_label:             Optional[str] = None
    n_patients:                int
    avg_hba1c_at_dropout:      float
    avg_expected_hba1c_6mo:    float
    avg_expected_hba1c_12mo:   float
    avg_bmi_at_dropout:        float
    avg_expected_bmi_12mo:     float
    avg_severity_score:        float
    p_new_t2d_12mo_mean:       Optional[float] = None
    p_uncontrolled_12mo_mean:  Optional[float] = None
    dm_status_distribution:    Dict[str, float]


class ReboundTrajectoryPoint(BaseModel):
    month:     float
    avg_hba1c: float
    avg_bmi:   float


class ReboundTrajectoryScenario(BaseModel):
    scenario:    str            # "early" | "median" | "late"
    dropout_day: float
    points:      List[ReboundTrajectoryPoint]


class ReboundTrajectoryCluster(BaseModel):
    cluster_id: int
    scenarios:  List[ReboundTrajectoryScenario]


class ReboundSensitivityScenario(BaseModel):
    scenario:                  str
    dropout_day:               float
    avg_hba1c_at_dropout:      float
    avg_expected_hba1c_12mo:   float
    avg_severity_score:        float
    p_new_t2d_12mo_mean:       Optional[float] = None
    p_uncontrolled_12mo_mean:  Optional[float] = None


class ReboundSensitivityCluster(BaseModel):
    cluster_id: int
    scenarios:  List[ReboundSensitivityScenario]


class ReboundRiskResponse(BaseModel):
    by_cluster:                  List[ReboundCluster]
    trajectory_by_cluster:       List[ReboundTrajectoryCluster]
    sensitivity:                 List[ReboundSensitivityCluster]
    population_t2d_incidence_12mo: float
    n_patients_total:             int
