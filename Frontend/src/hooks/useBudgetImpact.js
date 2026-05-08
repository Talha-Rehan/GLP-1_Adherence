import { useState, useCallback } from "react";
import { api } from "../data/api";
import { calcBudgetImpact } from "../data/mockData";

export function useBudgetImpact() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const calculate = useCallback(async (dropoutReductionPct, interventionCostPerPt, populationScopePct) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBudgetImpact({
        dropout_reduction_pct:          dropoutReductionPct,
        intervention_cost_per_patient:  interventionCostPerPt,
        population_scope_pct:           populationScopePct,
      });
      // Normalise API response to match calcBudgetImpact shape used in BudgetSimulator
      const segments = res.segments.map((s) => ({
        cluster:          s.cluster,
        label:            s.label,
        n:                s.n_in_scope,
        baselineDropout:  s.baseline_dropout_rate,
        newDropout:       s.new_dropout_rate,
        baselineWasted:   s.baseline_wasted_spend,
        wasteRecovered:   s.waste_recovered,
        interventionCost: s.intervention_cost,
        netSaving:        s.net_saving,
        roiPositive:      s.roi_positive,
      }));
      setResult(segments);
    } catch (err) {
      // Fallback to client-side calculation
      setError(err);
      setResult(calcBudgetImpact(dropoutReductionPct, interventionCostPerPt, populationScopePct));
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, calculate };
}
