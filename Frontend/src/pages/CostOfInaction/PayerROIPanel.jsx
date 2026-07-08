import { useState, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { DollarSign, Info, TrendingUp, Target, AlertCircle, Building2 } from 'lucide-react';
import { SectionHeader, KPICard } from '../../components/shared';
import { SkeletonCard, SkeletonChart } from '../../components/shared/LoadingSkeleton';
import { SEGMENT_COLORS, SEGMENT_SHORT } from '../../data/mockData';
import ROIBarChart from '../../components/charts/ROIBarChart';
import ROITrajectoryChart from '../../components/charts/ROITrajectoryChart';
import { usePayerROI } from '../../hooks/usePayerROI';

const fmtMoney = (n) => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
};
const fmtPct = (n) => Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';
const fmtROI = (n) => Number.isFinite(n) ? n.toFixed(2) : '—';

const PAYER_SCENARIOS = [
  { id: 'current',        label: 'Current (2025)',      sub: 'Commercial WAC × (1 − 0.35 rebate)' },
  { id: 'medicare_2028',  label: 'Medicare 2028',       sub: 'Projected CMS negotiation (~65% discount)' },
  { id: 'post_generic',   label: 'Post-generic 2032+',  sub: 'Biosimilar entry (~$1,500/yr net)' },
];

export default function PayerROIPanel() {
  const [interventionCost, setInterventionCost] = useState(500);
  const [payerType, setPayerType]               = useState('current');
  const { data, loading, error } = usePayerROI(interventionCost, payerType);

  const clusters = data?.by_cluster ?? [];
  const popROI1  = data?.population_roi_1yr;
  const popROI3  = data?.population_roi_3yr;
  const popROI5  = data?.population_roi_5yr;
  const popROI10 = data?.population_roi_10yr;
  const nTotal   = data?.n_patients_total ?? 0;

  if (error) {
    return (
      <div className="card p-6">
        <SectionHeader title="Payer ROI" />
        <div className="text-sm text-red-600">
          Failed to load /api/consequence/payer-roi. Check the backend is running and Mongo is populated.
        </div>
      </div>
    );
  }

  const clusterCards = useMemo(() => clusters.map((c, i) => {
    const currentAlpha = c.adherence_probability ?? 0;
    const beAlpha      = c.break_even_adherence_rate;
    const beReachable  = beAlpha != null && beAlpha <= 1.0;
    const alphaGap     = beReachable ? Math.max(0, beAlpha - currentAlpha) : null;
    const threshold5   = c.intervention_cost_threshold_5yr ?? 0;
    const roi5         = c.horizons?.find(h => h.horizon_years === 5)?.roi ?? 0;
    const roi10        = c.horizons?.find(h => h.horizon_years === 10)?.roi ?? 0;
    const roiPositive  = roi5 >= 0;
    // "Coverage ratio" — gross_benefit / drug_cost at 10yr — the honest "how close to break-even" signal.
    const gross10      = c.horizons?.find(h => h.horizon_years === 10)?.gross_benefit ?? 0;
    const drug10       = c.horizons?.find(h => h.horizon_years === 10)?.expected_drug_cost ?? 0;
    const coverage10   = drug10 > 0 ? gross10 / drug10 : 0;

    return (
      <div key={c.cluster_id} className="card p-4 animate-fade-up"
           style={{ animationDelay: `${i * 0.05}s`, borderTop: `3px solid ${SEGMENT_COLORS[c.cluster_id]}` }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: SEGMENT_COLORS[c.cluster_id] }}>
              Cluster {c.cluster_id}
            </div>
            <div className="text-xs text-gray-600 leading-tight">{c.cluster_label ?? SEGMENT_SHORT[c.cluster_id]}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: roi5 >= 0 ? '#E8F5E9' : '#FFEBEE', color: roi5 >= 0 ? '#2E7D32' : '#C62828' }}>
              5yr {fmtROI(roi5)}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: roi10 >= 0 ? '#E8F5E9' : '#FEF3C7', color: roi10 >= 0 ? '#2E7D32' : '#B45309' }}>
              10yr {fmtROI(roi10)}
            </span>
          </div>
        </div>

        {/* Break-even block — the headline metric per Phase 3 audit */}
        <div className="rounded-lg p-3 mt-2" style={{ background: '#F7FAFC' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            <Target size={11} /> Break-even Adherence
          </div>
          {beReachable ? (
            <>
              <div className="font-display text-xl font-semibold text-gray-800">{fmtPct(beAlpha)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Current: <span className="font-mono font-semibold text-gray-700">{fmtPct(currentAlpha)}</span>
                {alphaGap > 0.01 && (
                  <>
                    {' · '}Gap: <span className="font-mono font-semibold" style={{ color: '#C62828' }}>+{fmtPct(alphaGap)}</span>
                  </>
                )}
                {alphaGap != null && alphaGap <= 0.01 && (
                  <>{' · '}<span className="font-semibold" style={{ color: '#2E7D32' }}>Achieved</span></>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-lg font-semibold text-gray-500">Unreachable</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                On-therapy savings don't cover drug cost at any adherence rate.
                Cost avoidance is the wrong ROI lens for this cluster.
              </div>
            </>
          )}
        </div>

        {/* 10-year cost-coverage bar — how much of drug cost is offset by avoided complications */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-500 font-semibold uppercase tracking-wider">10-yr cost coverage</span>
            <span className="font-mono font-bold" style={{ color: coverage10 >= 1 ? '#2E7D32' : '#EF6C00' }}>
              {(coverage10 * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EDF2F7' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${Math.min(100, coverage10 * 100)}%`,
                   background: coverage10 >= 1 ? '#2E7D32' : coverage10 >= 0.5 ? '#EF6C00' : '#C62828',
                 }} />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 leading-tight">
            {fmtMoney(gross10)} avoided vs. {fmtMoney(drug10)} spent
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <DollarSign size={10} /> 5-yr headroom
            </span>
            <span className="font-mono font-semibold" style={{ color: threshold5 > 0 ? '#2E7D32' : '#C62828' }}>
              {fmtMoney(threshold5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Annual drug cost</span>
            <span className="font-mono">{fmtMoney(c.avg_annual_drug_cost)}</span>
          </div>
        </div>
      </div>
    );
  }), [clusters]);

  return (
    <div className="space-y-4">
      {/* Framing banner — negative-ROI is expected, this frames the panel correctly */}
      <div className="card p-4 flex items-start gap-3"
           style={{ background: '#F0F9FF', borderColor: '#BFDBFE' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
             style={{ background: '#1D4ED8' }}>
          <Info size={14} color="white" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1D4ED8' }}>Read this first</div>
          <div className="text-sm text-gray-700 mt-0.5 leading-relaxed">
            {payerType === 'current' && (
              <>Under <span className="font-semibold">today's commercial pricing</span> (WAC × 0.65 net), 5- and 10-year ROI
              are <span className="font-semibold">negative across all clusters</span>. Pure complication-avoidance math doesn't
              clear the drug cost at current prices. Switch to <span className="font-semibold">Medicare 2028</span> or
              <span className="font-semibold"> Post-generic 2032+</span> above to see how negotiated / generic pricing shifts
              the picture — this is the "when does GLP-1 pay off?" question rather than "does it?"</>
            )}
            {payerType === 'medicare_2028' && (
              <>Under <span className="font-semibold">projected Medicare 2028 negotiated pricing</span> (~65% off list),
              5-year ROI is still negative but 10-year ROI approaches zero for the moderate-risk clusters.
              Cluster 3 lands at ROI ≈ −0.17 at 10 years — one intervention iteration away from crossover.</>
            )}
            {payerType === 'post_generic' && (
              <>Under <span className="font-semibold">post-patent-expiry biosimilar pricing</span> (~$1,500/yr net),
              <span className="font-semibold"> three of four clusters flip positive within 3–7 years</span>. Cluster 3 crosses
              at year 3, Cluster 1 at year 4. This is the long-horizon picture that motivates continued investment in GLP-1
              adherence programs even when the near-term budget impact looks unfavorable.</>
            )}
          </div>
        </div>
      </div>

      {/* Header + payer_type selector + intervention slider */}
      <div className="card p-5">
        <SectionHeader
          title="Payer ROI by Cluster"
          sub="Return on GLP-1 program spend, at 1-, 3-, 5- and 10-year horizons"
          action={
            <div className="flex items-center gap-2 text-xs">
              <Building2 size={13} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Pricing scenario:</span>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#F7FAFC' }}>
                {PAYER_SCENARIOS.map(s => (
                  <button key={s.id} onClick={() => setPayerType(s.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                    title={s.sub}
                    style={{
                      background: payerType === s.id ? 'var(--color-primary)' : 'transparent',
                      color:      payerType === s.id ? 'white' : 'var(--text-secondary)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {/* Scenario sublabel */}
        <div className="text-[11px] text-gray-400 mb-4 -mt-2">
          {PAYER_SCENARIOS.find(s => s.id === payerType)?.sub}
        </div>

        {/* Intervention cost slider */}
        <div className="mb-6 rounded-xl p-4" style={{ background: '#F7FAFC' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-semibold text-gray-700">Intervention program cost per patient</label>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Slider re-computes ROI on the server. Debounced 250 ms.
              </div>
            </div>
            <div className="text-right">
              <span className="font-display font-semibold text-2xl" style={{ color: 'var(--color-primary)' }}>
                {fmtMoney(interventionCost)}
              </span>
              <div className="text-[11px] text-gray-400 mt-0.5">per patient / year</div>
            </div>
          </div>

          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-6"
            min={0} max={3000} step={50}
            value={[interventionCost]}
            onValueChange={([v]) => setInterventionCost(v)}
          >
            <Slider.Track className="relative grow h-1.5 rounded-full" style={{ background: '#E2E8F0' }}>
              <Slider.Range className="absolute h-full rounded-full" style={{ background: 'var(--color-primary)' }} />
            </Slider.Track>
            <Slider.Thumb
              className="block w-4 h-4 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              style={{ background: 'var(--color-primary)', border: '2px solid white' }}
              aria-label="Intervention cost"
            />
          </Slider.Root>

          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>$0</span><span>$1,000</span><span>$2,000</span><span>$3,000</span>
          </div>
        </div>

        {/* Population summary strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {loading && !data ? (
            <>
              <SkeletonCard h={100} /><SkeletonCard h={100} /><SkeletonCard h={100} /><SkeletonCard h={100} />
            </>
          ) : (
            <>
              <KPICard label="Population 1-yr ROI" value={fmtROI(popROI1)}
                sub={`${nTotal.toLocaleString()} patients`}
                icon={AlertCircle} color={popROI1 >= 0 ? '#2E7D32' : '#C62828'} />
              <KPICard label="Population 5-yr ROI" value={fmtROI(popROI5)}
                sub="Primary payer horizon"
                icon={Target} color={popROI5 >= 0 ? '#2E7D32' : '#C62828'} />
              <KPICard label="Population 10-yr ROI" value={fmtROI(popROI10)}
                sub="Sensitivity — long horizon"
                icon={TrendingUp} color={popROI10 >= 0 ? '#2E7D32' : '#EF6C00'} />
              <KPICard label="Intervention" value={fmtMoney(interventionCost)}
                sub="Current slider value"
                icon={DollarSign} color="#1E88E5" />
            </>
          )}
        </div>

        {/* ROI grouped bar chart */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">ROI at 1 / 3 / 5 / 10-year horizons, per cluster</div>
          {loading && !data ? <SkeletonChart h={320} /> : <ROIBarChart data={clusters} height={320} />}
          <div className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            Bars above the green dashed line have positive ROI at that horizon. Longer horizons (dark blue) trend
            toward less-negative ROI because avoided complications compound over time. Cluster 3 (Moderate) has
            the strongest trajectory — its 10-yr bar is closest to zero.
          </div>
        </div>
      </div>

      {/* ROI trajectory line chart */}
      <div className="card p-5">
        <div className="mb-2">
          <div className="text-sm font-semibold text-gray-700">10-year ROI trajectory</div>
          <div className="text-[11px] text-gray-400">
            Per-year ROI, years 1–10. Slope reveals which clusters are trending toward payoff vs. plateauing.
          </div>
        </div>
        {loading && !data ? <SkeletonChart h={320} /> : <ROITrajectoryChart data={clusters} height={320} />}
      </div>

      {/* Per-cluster cards */}
      <div className="grid grid-cols-4 gap-4">
        {loading && !data
          ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} h={240} />)
          : clusterCards}
      </div>
    </div>
  );
}
