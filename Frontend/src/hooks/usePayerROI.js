import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../data/api";

/**
 * Payer ROI hook.
 *
 * Fires an initial fetch and re-fetches whenever `interventionCost` OR
 * `payerType` changes. Debounced 250 ms — slider drags don't hammer the API.
 */
export function usePayerROI(interventionCost = 500, payerType = "current") {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const timer = useRef(null);

  const fetchNow = useCallback((cost, type) => {
    setLoading(true);
    setError(null);
    return api.getPayerROI(cost, type)
      .then(res => setData(res))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchNow(interventionCost, payerType), 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [interventionCost, payerType, fetchNow]);

  return { data, loading, error };
}
