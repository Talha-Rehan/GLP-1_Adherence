import { useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { LayoutGrid, Rows } from 'lucide-react';
import { SectionHeader, ProgressBar } from '../components/shared';
import { segmentProfiles, SEGMENT_COLORS, SEGMENT_LABELS, SEGMENT_SHORT } from '../data/mockData';

const fmt$ = (n) => `$${n.toLocaleString()}`;

const POP_AVGS = { age: 54.4, bmi: 34.7, hba1c: 6.22, cost_pressure: 31.9, bio_friction: 0.486, comorbidity: 0.97 };

function normalize(seg) {
  return [
    { axis: 'Age', value: Math.round((seg.age / 80) * 100), raw: `${seg.age.toFixed(0)}y` },
    { axis: 'BMI', value: Math.round((seg.bmi / 45) * 100), raw: `${seg.bmi}` },
    { axis: 'HbA1c', value: Math.round((seg.hba1c / 12) * 100), raw: `${seg.hba1c}%` },
    { axis: 'Cost Pressure', value: Math.round((seg.cost_pressure / 60) * 100), raw: seg.cost_pressure.toFixed(1) },
    { axis: 'Side Effects', value: Math.round((seg.bio_friction / 0.7) * 100), raw: seg.bio_friction.toFixed(3) },
    { axis: 'Comorbidity', value: Math.round((seg.comorbidity / 2) * 100), raw: `${seg.comorbidity.toFixed(2)}/2` },
  ];
}

const METRIC_FIELDS = [
  ['Adherence Rate', s => `${(s.adherence * 100).toFixed(1)}%`, s => s.adherence, 1],
  ['Patients', s => s.n.toLocaleString(), s => s.n, 2383],
  ['Avg OOP Cost', s => fmt$(s.oop_cost.toFixed(0)), s => s.oop_cost, 90],
  ['Cost/HbA1c Point', s => fmt$(s.cost_per_hba1c), s => s.cost_per_hba1c, 25311],
  ['Wasted Spend/Pt', s => fmt$(s.wasted_per_pt), s => s.wasted_per_pt, 8412],
  ['Bio Friction', s => s.bio_friction.toFixed(3), s => s.bio_friction, 0.6],
  ['Comorbidity', s => `${s.comorbidity.toFixed(2)}/2`, s => s.comorbidity, 2],
  ['Avg HbA1c', s => `${s.hba1c}%`, s => s.hba1c, 10],
];

export default function SegmentExplorer() {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState('single'); // 'single' | 'compare'
  const seg = segmentProfiles[active];
  const color = SEGMENT_COLORS[active];
  const radarData = normalize(seg);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-fade-in">
      {/* Tab row + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {segmentProfiles.map((s, i) => (
            <button key={i} onClick={() => { setActive(i); setMode('single'); }}
              className="flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all border"
              style={{ background: active === i ? SEGMENT_COLORS[i] : 'white', borderColor: active === i ? SEGMENT_COLORS[i] : '#E2E8F0',
                       color: active === i ? 'white' : '#4A5568', transform: active === i ? 'translateY(-2px)' : 'none',
                       boxShadow: active === i ? `0 4px 12px ${SEGMENT_COLORS[i]}44` : 'none' }}>
              <span className="text-xs font-bold leading-tight">{SEGMENT_SHORT[i]}</span>
              <span className="text-[10px] mt-0.5 opacity-80">n={s.n.toLocaleString()} · {(s.adherence*100).toFixed(0)}% adherent</span>
            </button>
          ))}
        </div>
        <button onClick={() => setMode(m => m === 'single' ? 'compare' : 'single')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300 transition-colors">
          {mode === 'single' ? <><Rows size={14} /> Compare All</> : <><LayoutGrid size={14} /> Single View</>}
        </button>
      </div>

      {mode === 'single' ? (
        <>
          <div className="grid grid-cols-3 gap-5">
            {/* Radar */}
            <div className="card p-5">
              <SectionHeader title="Clinical Profile" sub="vs population average (ghost)" />
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#718096' }} />
                  <Radar name="Segment" dataKey="value" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="Population Avg" dataKey="value"
                    data={normalize({ age: POP_AVGS.age, bmi: POP_AVGS.bmi, hba1c: POP_AVGS.hba1c, cost_pressure: POP_AVGS.cost_pressure, bio_friction: POP_AVGS.bio_friction, comorbidity: POP_AVGS.comorbidity })}
                    stroke="#CBD5E0" fill="#CBD5E0" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics grid */}
            <div className="card p-5">
              <SectionHeader title="Key Metrics" sub={SEGMENT_LABELS[active]} />
              <div className="grid grid-cols-2 gap-3">
                {METRIC_FIELDS.map(([label, fmt, getter]) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: '#F7FAFC' }}>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</div>
                    <div className="font-display text-lg font-semibold" style={{ color }}>{fmt(seg)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adherence bar + notes */}
            <div className="card p-5 space-y-4">
              <SectionHeader title="Adherence Breakdown" sub="vs population" />
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">This segment</span>
                  <span className="font-semibold" style={{ color }}>{(seg.adherence*100).toFixed(1)}%</span>
                </div>
                <ProgressBar value={seg.adherence} color={color} height={8} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Population avg</span>
                  <span className="font-semibold text-gray-600">47.0%</span>
                </div>
                <ProgressBar value={0.47} color="#CBD5E0" height={8} />
              </div>

              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Characteristics</div>
                {[
                  `Age: ${seg.age.toFixed(0)}y avg`,
                  `HbA1c: ${seg.hba1c}% (${seg.hba1c >= 6.5 ? 'Diabetic' : seg.hba1c >= 5.7 ? 'Pre-diabetic' : 'Normal'})`,
                  `Side effect risk: ${seg.bio_friction < 0.3 ? 'Low' : seg.bio_friction < 0.5 ? 'Moderate' : 'High'} (${seg.bio_friction})`,
                  `Financial pressure: ${seg.cost_pressure < 25 ? 'Low' : seg.cost_pressure < 40 ? 'Moderate' : 'High'} index`,
                ].map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {note}
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3 text-xs" style={{ background: `${color}12`, borderLeft: `3px solid ${color}` }}>
                <div className="font-semibold mb-1" style={{ color }}>Intervention Priority</div>
                <div className="text-gray-600">
                  {active === 0 ? 'High — Low clinical urgency driving dropout. Focus on perceived benefit and outcome visibility.' :
                   active === 1 ? 'High — Financial barriers are primary driver. Target copay assistance and cost support.' :
                   active === 2 ? 'Low — Segment is performing well. Monitor for refill gaps only.' :
                   'Medium — Mixed drivers. Combination of side effect management and adherence check-ins.'}
                </div>
              </div>
            </div>
          </div>

          {/* Cost comparison bar */}
          <div className="card p-5">
            <SectionHeader title="Cost-Effectiveness Comparison" sub="Cost per unit of clinical outcome — lower is better" />
            <div className="grid grid-cols-2 gap-5">
              {['cost_per_hba1c', 'cost_per_weight'].map(metric => (
                <div key={metric}>
                  <div className="text-xs text-gray-500 mb-3">{metric === 'cost_per_hba1c' ? 'Cost per HbA1c point reduced ($)' : 'Cost per % body weight lost ($)'}</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={segmentProfiles.map(s => ({ name: SEGMENT_SHORT[s.cluster].split(' ').slice(0,2).join(' '), value: s[metric] }))} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, '']} />
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {segmentProfiles.map((_, i) => <Cell key={i} fill={SEGMENT_COLORS[i]} opacity={i === active ? 1 : 0.35} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Compare mode */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {segmentProfiles.map((s, i) => (
                    <th key={i}>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEGMENT_COLORS[i] }} />
                        {SEGMENT_SHORT[i]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Patients', s => s.n.toLocaleString()],
                  ['Adherence Rate', s => `${(s.adherence*100).toFixed(1)}%`],
                  ['Dropout Rate', s => `${((1-s.adherence)*100).toFixed(1)}%`],
                  ['Avg Age', s => `${s.age.toFixed(0)}y`],
                  ['Avg BMI', s => `${s.bmi}`],
                  ['Avg HbA1c', s => `${s.hba1c}%`],
                  ['OOP Cost', s => `$${s.oop_cost.toFixed(0)}`],
                  ['Cost Pressure Index', s => s.cost_pressure.toFixed(1)],
                  ['Bio Friction', s => s.bio_friction.toFixed(3)],
                  ['Comorbidity Score', s => `${s.comorbidity.toFixed(2)}/2`],
                  ['Wasted Spend/Pt', s => `$${s.wasted_per_pt.toLocaleString()}`],
                  ['Cost/HbA1c Point', s => `$${s.cost_per_hba1c.toLocaleString()}`],
                  ['Cost/Weight% Lost', s => `$${s.cost_per_weight.toLocaleString()}`],
                ].map(([label, fmt]) => (
                  <tr key={label}>
                    <td className="font-medium text-gray-600">{label}</td>
                    {segmentProfiles.map((s, i) => (
                      <td key={i} style={{ borderLeft: `3px solid ${SEGMENT_COLORS[i]}30` }}>
                        <span className="font-mono text-sm">{fmt(s)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
