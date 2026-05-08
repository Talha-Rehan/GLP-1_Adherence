import { useState, useEffect, useCallback } from "react";
import { api } from "../data/api";
import { patients as mockPatients } from "../data/mockData";

export function usePatients() {
  const [patients, setPatients] = useState(mockPatients);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    // Fetch all patients (large page size) to replicate mock behaviour
    api.getPatients({ page: 0, page_size: 100, sort_by: "dropout_prob", sort_dir: "desc" })
      .then((res) => setPatients(res.patients))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { patients, loading, error };
}
