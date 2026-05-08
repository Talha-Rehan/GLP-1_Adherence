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

Place the following files in `Backend/data/` before starting the server.
The server starts without them (falling back to mockData values) and picks them
up as soon as they are present — no restart needed after first run.

| File | Source |
|---|---|
| `GLP1_FINAL_WITH_SURVIVAL.csv` | Output of `Fusion/final.py` |
| `shap_patient_drivers.csv` | Output of `Model/model.ipynb` |
| `segment_profiles.csv` | Output of `Model/model.ipynb` |
| `survival_checkpoints.csv` | Output of `Model/model.ipynb` |
| `cost_effectiveness.csv` | Output of `Model/model.ipynb` |
| `icer_by_segment.csv` | Output of `Model/model.ipynb` |
| `budget_impact.csv` | Output of `Model/model.ipynb` |
| `shap_values_test.npy` | Output of `Model/model.ipynb` |
| `final_gb_model.pkl` | Output of `Model/model.ipynb` |

## Environment variables (`.env`)

```
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
