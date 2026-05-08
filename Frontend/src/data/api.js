const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  getSummary:           ()       => get("/api/summary"),
  getGlobalSHAP:        ()       => get("/api/shap/global"),
  getPatients:          (params) => get("/api/patients?" + new URLSearchParams(params)),
  getPatient:           (id)     => get(`/api/patients/${id}`),
  getSegments:          ()       => get("/api/segments"),
  getSegment:           (id)     => get(`/api/segments/${id}`),
  getSurvival:          ()       => get("/api/survival"),
  getCostEffectiveness: ()       => get("/api/cost-effectiveness"),
  getBudgetImpact:      (body)   => post("/api/budget-impact", body),
  getModelInfo:         ()       => get("/api/model/info"),
};
