import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import { SectionHeader, CheckpointTable } from '../components/shared';
import { survivalCurves, survivalCheckpoints, medianSurvival, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/mockData';

// Merge all curves into one dataset keyed by day
const mergedData = survivalCurves[0].data.map((_, idx) => {
  const day = survivalCurves[0].data[idx].day;
  const point = { day };
  survivalCurves.forEach(sc => { point[`seg${sc.cluster}`] = sc.data[idx].survival; });
  return point;
});

export default function SurvivalAnalysis() {
  const [visible, setVisible] = useState([0, 1, 2, 3]);
  const [showCI, setShowCI] = useState(true);
  const [showRefs, setShowRefs] = useState(true);
  const [highlight, setHighlight] = useState(null);

  const toggle = (i) => setVisible(v => v.includes(i) ? v.filter(x => x !== i) : [...v, i]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-fade-in">
      {/* Main KM chart */}
      <div className="card p-5">
        <SectionHeader title="Kaplan-Meier Survival Curves" sub="Probability of remaining on GLP-1 therapy over 180 days · Log-rank p < 0.000001" />
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={mergedData} margin={{ top: 8, right: 24, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" label={{ value: 'Days on Therapy', position: 'insideBottom', offset: -12, fontSize: 12 }}
              ticks={[0,30,60,90,120,150,180]} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v*100)}%`} tick={{ fontSize: 11 }}
              label={{ value: 'Survival Probability', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12 }} />
            <Tooltip formatter={(v, name) => [`${(v*100).toFixed(1)}%`, name]}
              labelFormatter={v => `Day ${v}`} content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="card px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold text-gray-600 mb-1.5">Day {label}</div>
                    {payload.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                          <span className="text-gray-500 text-[10px]">{p.name}</span>
                        </span>
                        <span className="font-semibold font-mono">{(p.value*100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
            {showRefs && [30,60,90,180].map(d => (
              <ReferenceLine key={d} x={d} stroke="#CBD5E0" strokeDasharray="3 3"
                label={{ value: `${d}d`, position: 'top', fontSize: 9, fill: '#A0AEC0' }} />
            ))}
            {survivalCurves.map(sc => visible.includes(sc.cluster) && (
              <Line key={sc.cluster} type="monotone" dataKey={`seg${sc.cluster}`}
                stroke={sc.color} strokeWidth={highlight === null || highlight === sc.cluster ? 2.5 : 1}
                opacity={highlight === null || highlight === sc.cluster ? 1 : 0.2}
                dot={false} name={SEGMENT_LABELS[sc.cluster].split(' ').slice(0,3).join(' ')} />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {survivalCurves.map(sc => (
              <button key={sc.cluster} onClick={() => toggle(sc.cluster)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{ borderColor: visible.includes(sc.cluster) ? sc.color : '#E2E8F0',
                         background: visible.includes(sc.cluster) ? `${sc.color}15` : 'white',
                         color: visible.includes(sc.cluster) ? sc.color : '#A0AEC0' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: visible.includes(sc.cluster) ? sc.color : '#E2E8F0' }} />
                {SEGMENT_LABELS[sc.cluster].split(' ').slice(0,2).join(' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 ml-auto text-xs text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showRefs} onChange={e => setShowRefs(e.target.checked)} className="w-3.5 h-3.5" />
              Reference lines
            </label>
            <select value={highlight ?? ''} onChange={e => setHighlight(e.target.value ? +e.target.value : null)}
              className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white focus:outline-none">
              <option value="">Highlight segment…</option>
              {survivalCurves.map(sc => <option key={sc.cluster} value={sc.cluster}>{SEGMENT_LABELS[sc.cluster].split(' ').slice(0,3).join(' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Median survival cards */}
      <div className="grid grid-cols-4 gap-4">
        {survivalCurves.map(sc => {
          const med = medianSurvival[sc.cluster];
          return (
            <div key={sc.cluster} className="card p-4 animate-fade-up" style={{ borderTop: `3px solid ${sc.color}` }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: sc.color }}>
                Cluster {sc.cluster}
              </div>
              <div className="text-xs text-gray-600 mb-3 leading-snug">{SEGMENT_LABELS[sc.cluster]}</div>
              <div className="font-display text-2xl font-semibold" style={{ color: sc.color }}>
                {med > 180 ? '>180' : `Day ${med}`}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {med > 180 ? 'Majority never dropout' : '50% have discontinued by this day'}
              </div>
              <div className="mt-3 text-xs text-gray-600">
                n={[1902,2104,2383,1177][sc.cluster].toLocaleString()} · {(sc.adherence*100).toFixed(0)}% adherent
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkpoint table */}
      <div className="card p-5">
        <SectionHeader title="Dropout Rates at Clinical Checkpoints" sub="% of patients who have discontinued by each time point" />
        <CheckpointTable data={survivalCheckpoints} />
        <div className="mt-4 p-4 rounded-lg text-xs leading-relaxed text-gray-600"
             style={{ background: '#F7FAFC', border: '1px solid #E2E8F0' }}>
          <b>Clinical interpretation:</b> The Low Friction Strong Adherer segment (green) shows minimal dropout through the full 180-day window — only 14.6% have discontinued by day 180. The Low Urgency Dropout Risk segment (red) is the fastest-collapsing population, with nearly 1 in 5 patients gone by day 30 and 79.2% discontinued by day 180. Clusters 1 and 3 decay steadily across the full window, suggesting sustained intervention is more effective than a single early touchpoint for these groups.
        </div>
      </div>

      {/* Statistical note */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs"
           style={{ background: '#E8F5E9', border: '1px solid #C8E6C9', color: '#1B5E20' }}>
        <span className="font-bold">✓ Statistically Significant</span>
        Multivariate log-rank test: χ² = 2354.82 · p &lt; 0.000001 · Segment membership meaningfully predicts dropout timing
      </div>
    </div>
  );
}
