import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SectionHeader } from '../components/shared';
import { ceaData, SEGMENT_COLORS, SEGMENT_SHORT } from '../data/mockData';

const ICER_THRESHOLD = 50000;

export default function CostEffectiveness() {
  const [metric, setMetric] = useState('hba1c'); // 'hba1c' | 'weight'
  const [comparator, setComparator] = useState('insulin'); // 'insulin' | 'sglt2'

  const scatterData = ceaData.map((s, i) => ({
    x: metric === 'hba1c' ? s.hba1c_reduction : s.weight_loss,
    y: s.annual_cost,
    n: s.n,
    label: s.label,
    color: SEGMENT_COLORS[i],
    cluster: i,
  }));

  const icerKey = `icer_${comparator}_${metric}`;
  const icerData = ceaData.map((s, i) => ({
    name: SEGMENT_SHORT[i].split(' ').slice(0,2).join(' '),
    icer: s[icerKey] ?? (metric === 'hba1c' ? (comparator === 'insulin' ? s.icer_insulin_hba1c : s.icer_sglt2_hba1c) : (comparator === 'insulin' ? s.icer_insulin_weight : s.icer_sglt2_weight)),
    color: SEGMENT_COLORS[i],
  }));

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-fade-in">
      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Outcome Metric</div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[['hba1c', 'HbA1c Reduction'], ['weight', 'Weight Loss']].map(([k, label]) => (
              <button key={k} onClick={() => setMetric(k)}
                className="px-4 py-2 text-xs font-medium transition-colors"
                style={{ background: metric === k ? 'var(--color-primary)' : 'white', color: metric === k ? 'white' : '#4A5568' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">vs Comparator</div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[['insulin', 'Insulin Glargine'], ['sglt2', 'SGLT2 Inhibitor']].map(([k, label]) => (
              <button key={k} onClick={() => setComparator(k)}
                className="px-4 py-2 text-xs font-medium transition-colors"
                style={{ background: comparator === k ? 'var(--color-primary)' : 'white', color: comparator === k ? 'white' : '#4A5568' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-[10px] text-gray-400 leading-relaxed max-w-[260px]">
          Benchmarks: STEP 1–4 (Semaglutide), SURMOUNT-1 (Tirzepatide), SCALE (Liraglutide). ICER threshold: $50,000.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Scatter */}
        <div className="card p-5">
          <SectionHeader title="Cost vs Clinical Outcome" sub="Bubble size = population size · Bottom-right = best value" />
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid />
              <XAxis dataKey="x" name={metric === 'hba1c' ? 'HbA1c Reduction (pts)' : 'Weight Loss (%)'}
                label={{ value: metric === 'hba1c' ? 'HbA1c Reduction (pts)' : 'Weight Loss (%)', position: 'insideBottom', offset: -12, fontSize: 11 }}
                tick={{ fontSize: 11 }} />
              <YAxis dataKey="y" name="Annual Drug Cost"
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }}
                label={{ value: 'Annual Drug Cost ($)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11 }} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="card px-3 py-2 text-xs">
                    <b style={{ color: d.color }}>{d.label}</b><br/>
                    {metric === 'hba1c' ? `HbA1c Δ: -${d.x} pts` : `Weight loss: ${d.x}%`}<br/>
                    Annual cost: ${d.y.toLocaleString()}<br/>
                    n = {d.n.toLocaleString()}
                  </div>
                );
              }} />
              <ReferenceLine x={ceaData.reduce((a,s) => a + (metric==='hba1c'?s.hba1c_reduction:s.weight_loss),0)/4}
                stroke="#CBD5E0" strokeDasharray="4 2" label={{ value: 'Avg outcome', fontSize: 9, fill: '#A0AEC0' }} />
              <ReferenceLine y={ceaData.reduce((a,s) => a + s.annual_cost,0)/4}
                stroke="#CBD5E0" strokeDasharray="4 2" label={{ value: 'Avg cost', fontSize: 9, fill: '#A0AEC0' }} />
              <Scatter data={scatterData} shape={(props) => {
                const { cx, cy, payload } = props;
                const r = Math.sqrt(payload.n / 2383) * 28;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.25} stroke={payload.color} strokeWidth={2} />
                    <text x={cx} y={cy} dy={-r-4} textAnchor="middle" fontSize={9} fill={payload.color} fontWeight={600}>
                      {SEGMENT_SHORT[payload.cluster].split(' ')[0]}
                    </text>
                  </g>
                );
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* ICER bars */}
        <div className="card p-5">
          <SectionHeader title={`ICER vs ${comparator === 'insulin' ? 'Insulin Glargine' : 'SGLT2 Inhibitor'}`}
            sub={`Incremental cost per ${metric === 'hba1c' ? 'HbA1c point reduced' : '% body weight lost'} · $50k threshold line`} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={icerData} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <ReferenceLine y={ICER_THRESHOLD} stroke="#EF5350" strokeDasharray="5 3"
                label={{ value: '$50k threshold', position: 'right', fontSize: 9, fill: '#EF5350' }} />
              <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'ICER']} />
              <Bar dataKey="icer" radius={[4,4,0,0]} name="ICER">
                {icerData.map((d, i) => <Cell key={i} fill={d.icer > ICER_THRESHOLD ? SEGMENT_COLORS[i] : '#43A047'} opacity={d.icer > ICER_THRESHOLD ? 1 : 0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-[11px] text-gray-500 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block"></span> Below $50k — cost-effective</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#EF5350'}}></span> Above $50k — review value</span>
          </div>
        </div>
      </div>

      {/* Ranking table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <SectionHeader title="Cost-Efficiency Ranking" sub="All segments compared across key economic metrics" />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th><th>Segment</th><th>Adherence</th>
                <th>Annual Cost</th><th>Cost / HbA1c Pt</th><th>Cost / Weight%</th>
                <th>ICER vs Insulin</th><th>ICER vs SGLT2</th>
              </tr>
            </thead>
            <tbody>
              {[...ceaData].sort((a,b) => a.cost_per_hba1c - b.cost_per_hba1c).map((s, rank) => {
                const i = ceaData.indexOf(s);
                return (
                  <tr key={i}>
                    <td><span className="font-bold text-sm" style={{ color: SEGMENT_COLORS[i] }}>#{rank+1}</span></td>
                    <td><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{background:SEGMENT_COLORS[i]}}/>{s.label}</div></td>
                    <td><span className="font-semibold" style={{color: s.cluster===2?'#2E7D32':'#EF5350'}}>{(ceaData[i===0?0:i].hba1c_reduction&&(([0.208,0.309,0.854,0.406][ceaData.indexOf(s)]*100).toFixed(0)+'%'))}</span></td>
                    <td className="font-mono">${s.annual_cost.toLocaleString()}</td>
                    <td className="font-mono">{rank===0?<span className="text-green-700 font-semibold">${s.cost_per_hba1c.toLocaleString()}</span>:rank===3?<span className="text-red-600 font-semibold">${s.cost_per_hba1c.toLocaleString()}</span>:`$${s.cost_per_hba1c.toLocaleString()}`}</td>
                    <td className="font-mono">${s.cost_per_weight.toLocaleString()}</td>
                    <td className="font-mono text-xs">${s.icer_insulin_hba1c.toLocaleString()}</td>
                    <td className="font-mono text-xs">${s.icer_sglt2_hba1c.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
