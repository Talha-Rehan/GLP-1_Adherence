import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { DollarSign, TrendingUp, Target, Building2 } from 'lucide-react';
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
const fmtPct  = (n) => Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';
const fmtROIx = (n) => Number.isFinite(n) ? `${n.toFixed(2)}×` : '—';

const PAYER_SCENARIOS = [
  { id: 'current',       label: 'Current (2025)' },
  { id: 'medicare_2028', label: 'Medicare 2028'  },
  { id: 'post_generic',  label: 'Post-generic 2032+' },
];

// intervention_roi_net incorporates the extra drug spend from higher adherence,
// so it actually responds to payer_type (cheaper drugs = better net return).
const ROI_FIELD = 'intervention_roi_net';

export default function PayerROIPanel() {
  const [interventionCost, setInterventionCost] = useState(500);
  const [payerType,        setPayerType]        = useState('current');
  const [adherenceUplift,  setAdherenceUplift]  = useState(0.15);
  const { data, loading, error } = usePayerROI(interventionCost, payerType, adherenceUplift);

  const clusters  = data?.by_cluster ?? [];
  const nTotal    = data?.n_patients_total ?? 0;
  const pop5      = data?.population_intervention_roi_net_5yr;
  const pop10     = data?.population_intervention_roi_net_10yr;
  const avgDrugCost = clusters.length
    ? clusters.reduce((s, c) => s + c.avg_annual_drug_cost, 0) / clusters.length
    : null;

  if (error) {
    return (
      <div className="card p-6">
        <SectionHeader title="Payer ROI" />
        <div className="text-sm text-red-600">
          Failed to load payer ROI data. Check the backend is running.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <SectionHeader
          title="Payer ROI by Cluster"
          sub="Net return on adherence program spend — medical savings minus extra drug cost, per $1 of program spend"
          action={
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-gray-400" />
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#F7FAFC' }}>
                {PAYER_SCENARIOS.map(s => (
                  <button key={s.id} onClick={() => setPayerType(s.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
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

        {/* Sliders */}
        <div className="grid grid-cols-2 gap-4 mt-1 mb-5">
          <div className="rounded-xl p-4" style={{ background: '#F7FAFC' }}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Program cost / patient</label>
              <span className="font-display font-semibold text-xl" style={{ color: 'var(--color-primary)' }}>
                {fmtMoney(interventionCost)}<span className="text-[11px] text-gray-400 font-normal ml-1">/ yr</span>
              </span>
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
                aria-label="Program cost"
              />
            </Slider.Root>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>$0</span><span>$1,500</span><span>$3,000</span>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#F0FDF4' }}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Adherence uplift (Δα)</label>
              <span className="font-display font-semibold text-xl" style={{ color: '#16A34A' }}>
                +{fmtPct(adherenceUplift)}
              </span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-6"
              min={0} max={0.5} step={0.01}
              value={[adherenceUplift]}
              onValueChange={([v]) => setAdherenceUplift(v)}
            >
              <Slider.Track className="relative grow h-1.5 rounded-full" style={{ background: '#DCFCE7' }}>
                <Slider.Range className="absolute h-full rounded-full" style={{ background: '#16A34A' }} />
              </Slider.Track>
              <Slider.Thumb
                className="block w-4 h-4 rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-green-300"
                style={{ background: '#16A34A', border: '2px solid white' }}
                aria-label="Adherence uplift"
              />
            </Slider.Root>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0%</span><span>+25%</span><span>+50%</span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {loading && !data ? (
            <><SkeletonCard h={100} /><SkeletonCard h={100} /><SkeletonCard h={100} /></>
          ) : (
            <>
              <KPICard label="Population 5-yr Net ROI"
                value={fmtROIx(pop5)}
                sub={`${nTotal.toLocaleString()} patients`}
                icon={Target} color={pop5 >= 0 ? '#2E7D32' : '#C62828'} />
              <KPICard label="Population 10-yr Net ROI"
                value={fmtROIx(pop10)}
                sub="Long-horizon program return"
                icon={TrendingUp} color={pop10 >= 0 ? '#2E7D32' : '#EF6C00'} />
              <KPICard label="Avg annual drug cost"
                value={fmtMoney(avgDrugCost)}
                sub={`+${fmtPct(adherenceUplift)} uplift · ${fmtMoney(interventionCost)}/pt program`}
                icon={DollarSign} color="#1D4ED8" />
            </>
          )}
        </div>

        {/* Bar chart */}
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Net ROI at 1 / 3 / 5 / 10-year horizons, by cluster
        </div>
        {loading && !data
          ? <SkeletonChart h={300} />
          : <ROIBarChart data={clusters} height={300} roiField={ROI_FIELD} />}
      </div>

      {/* Trajectory chart */}
      <div className="card p-5">
        <div className="text-sm font-semibold text-gray-700 mb-0.5">10-year Net ROI trajectory</div>
        <div className="text-[11px] text-gray-400 mb-3">Per-year net return by cluster — lower drug prices shift all lines upward.</div>
        {loading && !data
          ? <SkeletonChart h={300} />
          : <ROITrajectoryChart data={clusters} height={300} roiField={ROI_FIELD} />}
      </div>

      {/* Cluster cards */}
      <div className="grid grid-cols-4 gap-4">
        {loading && !data
          ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} h={180} />)
          : clusters.map((c, i) => {
              const h5  = c.horizons?.find(h => h.horizon_years === 5);
              const h10 = c.horizons?.find(h => h.horizon_years === 10);
              const roi5  = h5?.[ROI_FIELD] ?? null;
              const roi10 = h10?.[ROI_FIELD] ?? null;
              const alphaBase = c.adherence_probability ?? 0;
              const alphaWith = c.adherence_with_program ?? alphaBase;

              return (
                <div key={c.cluster_id} className="card p-4 animate-fade-up"
                     style={{ animationDelay: `${i * 0.05}s`, borderTop: `3px solid ${SEGMENT_COLORS[c.cluster_id]}` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                       style={{ color: SEGMENT_COLORS[c.cluster_id] }}>
                    Cluster {c.cluster_id}
                  </div>
                  <div className="text-xs text-gray-600 mb-3">{c.cluster_label ?? SEGMENT_SHORT[c.cluster_id]}</div>

                  <div className="flex gap-2 mb-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: roi5 >= 0 ? '#E8F5E9' : '#FFEBEE', color: roi5 >= 0 ? '#2E7D32' : '#C62828' }}>
                      5yr {fmtROIx(roi5)}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: roi10 >= 0 ? '#E8F5E9' : '#FEF3C7', color: roi10 >= 0 ? '#2E7D32' : '#B45309' }}>
                      10yr {fmtROIx(roi10)}
                    </span>
                  </div>

                  <div className="rounded-lg p-3" style={{ background: '#F7FAFC' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                      <Target size={10} /> Adherence
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Baseline</span>
                        <span className="font-mono font-semibold text-gray-700">{fmtPct(alphaBase)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>With program</span>
                        <span className="font-mono font-semibold" style={{ color: '#2E7D32' }}>{fmtPct(alphaWith)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
