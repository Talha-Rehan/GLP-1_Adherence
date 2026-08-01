# GLP-1 Analytics — Backend

FastAPI backend for the GLP-1 Adherence & Cost Intelligence Platform.

## Quick start

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Data files

All pipeline artifacts required by the backend are **committed** under `Backend/data/`:

| File | Source | Consumed by |
|---|---|---|
| `GLP1_FINAL_WITH_SURVIVAL.csv` | `Fusion/final.py` | seeder → `patients` collection |
| `GLP1_CLEANED.csv` | `Processing/cleanup.ipynb` | pipeline reference (not read at runtime) |
| `GLP1_SEGMENTED.csv` | `Model/model.ipynb` (K-Means) | pipeline reference |
| `shap_patient_drivers.csv` | `Model/model.ipynb` (SHAP) | seeder → merged into `patients` |
| `shap_values_test.npy` | `Model/model.ipynb` (SHAP) | loaded at startup by `core/loader.py` |
| `final_gb_model.pkl` | `Model/model.ipynb` | loaded at startup by `core/loader.py` |
| `cost_effectiveness.csv`, `icer_by_segment.csv` | `Model/model.ipynb` (CEA) | seeder → `cost_effectiveness` |
| `budget_impact.csv` | `Model/model.ipynb` | pipeline reference |
| `segment_profiles.csv` | `Model/model.ipynb` | pipeline reference (`segment_profiles` collection is re-computed from `patients` at seed time) |
| `survival_checkpoints.csv` | `Model/model.ipynb` (KM) | seeder → `survival_checkpoints` |
| `progression_cost.csv` | `Model/consequence/downstream_cost.py` | seeder → `progression_cost` |
| `rebound_risk.csv`, `rebound_trajectory.csv`, `rebound_sensitivity.csv` | `Model/consequence/rebound_risk.py` | seeder → three `rebound_*` collections |
| `payer_roi.csv`, `payer_roi_yearly.csv` | `Model/consequence/payer_roi.py` | seeder → two `payer_roi*` collections |

To regenerate any of these, re-run the source script/notebook, then re-run `python -m scripts.migrate_csv_to_mongo` to push into Mongo.

## Environment variables (`.env`)

```
MONGODB_URI=<your Atlas URI or mongodb://localhost:27017>
MONGODB_DB_NAME=glp1_analytics
DATA_DIR=./data
CORS_ORIGINS=["http://localhost:5173","http://localhost:4173"]
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/summary` | KPI strip + adherence by segment + dropout windows |
| GET | `/api/shap/global` | Global SHAP feature importances |
| GET | `/api/patients` | Paginated patient list with filters |
| GET | `/api/patients/{id}` | Single patient detail + SHAP drivers |
| GET | `/api/segments` | All 4 segment profiles |
| GET | `/api/segments/{id}` | Single segment + feature distributions |
| GET | `/api/survival` | KM curves + checkpoints + median survival |
| GET | `/api/cost-effectiveness` | CEA ratios + ICER data |
| POST | `/api/budget-impact` | Real-time budget impact calculation |
| GET | `/api/model/info` | Model metadata and performance metrics |
| GET | `/health` | Health check |
