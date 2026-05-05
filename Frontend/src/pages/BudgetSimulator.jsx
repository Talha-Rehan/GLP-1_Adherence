import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { SectionHeader } from '../components/shared';
import { calcBudgetImpact, SEGMENT_COLORS, SEGMENT_SHORT } from '../data/mockData';
import { TrendingDown, DollarSign, CheckCircle, XCircle } from 'lucide-react';

function ScenarioSlider({ label, value, min, max, step, onChange, format }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="font-mono font-semibold text-base" style={{ color: 'var(--color-primary)' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function BudgetSimulator() {
  const [dropoutReduction, setDropoutReduction] = useState(15);
  const [interventionCost, setInterventionCost] = useState(500);
  const [scope, setScope] = useState(100);

  const results = useMemo(() => calcBudgetImpact(dropoutReduction, interventionCost, scope), [dropoutReduction, interventionCost, scope]);
  const totalNet = results.reduce((a, r) => a + r.netSaving, 0);
  const totalWasteRecovered = results.reduce((a, r) => a + r.wasteRecovered, 0);
  const totalInterventionCost = results.reduce((a, r) => a + r.interventionCost, 0);

  // Build 12-month cumulative chart
  const monthlyData = Array.from({ length: 13 }, (_, i) => ({
    month: i,
    withIntervention: Math.round((totalNet / 12) * i),
    baseline: 0,
  }));

  const breakEvenMonth = totalNet > 0
    ? Math.ceil(totalInterventionCost / (totalWasteRecovered / 12))
    : null;

  const fmt$ = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`;

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-fade-in">
      {/* Sliders */}
      <div className="card p-6">
        <SectionHeader title="Scenario Parameters" sub="Adjust assumptions to model different intervention strategies" />
        <div className="grid grid-cols-3 gap-8">
          <ScenarioSlider label="Dropout Reduction Assumed" value={dropoutReduction} min={5} max={50} step={5}
            onChange={setDropoutReduction} format={v => `${v}%`} />
          <ScenarioSlider label="Intervention Cost per Patient" value={interventionCost} min={100} max={2000} step={100}
            onChange={setInterventionCost} format={v => `$${v}`} />
          <ScenarioSlider label="Population in Program" value={scope} min={10} max={100} step={10}
            onChange={setScope} format={v => `${v}%`} />
        </div>
      </div>

      {/* Total banner */}
      <div className="card p-6 flex items-center justify-between"
           style={{ background: totalNet > 0 ? 'linear-gradient(135deg, #E8F5E9, #F1F8E9)' : 'linear-gradient(135deg, #FFEBEE, #FFF3F3)',
                    borderColor: totalNet > 0 ? '#C8E6C9' : '#FFCDD2' }}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: totalNet > 0 ? '#2E7D32' : '#C62828' }}>
            {totalNet > 0 ? '✓ Positive ROI Scenario' : '⚠ Negative ROI Scenario'}
          </div>
          <div className="font-display text-4xl font-semibold" style={{ color: totalNet > 0 ? '#1B5E20' : '#B71C1C' }}>
            {totalNet > 0 ? '+' : ''}{fmt$(totalNet)}
          </div>
          <div className="text-sm mt-1" style={{ color: totalNet > 0 ? '#388E3C' : '#C62828' }}>
            Estimated annual net saving
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            ['Waste Recovered', fmt$(totalWasteRecovered), DollarSign, '#2E7D32'],
            ['Intervention Cost', fmt$(totalInterventionCost), TrendingDown, '#EF6C00'],
            ['Break-even', breakEvenMonth ? `Month ${breakEvenMonth}` : 'N/A', CheckCircle, '#1B4F8A'],
          ].map(([label, val, Icon, color]) => (
            <div key={label}>
              <Icon size={18} className="mx-auto mb-1" style={{ color }} />
              <div className="font-display text-xl font-semibold" style={{ color }}>{val}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-4 gap-4">
        {results.map((r, i) => (
          <div key={i} className="card p-4 animate-fade-up" style={{ animationDelay: `${i*0.06}s`, borderTop: `3px solid ${SEGMENT_COLORS[i]}` }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SEGMENT_COLORS[i] }}>
                  Cluster {i}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 leading-tight">{r.label}</div>
              </div>
              {r.roiPositive
                ? <CheckCircle size={16} style={{ color: '#2E7D32' }} />
                : <XCircle size={16} style={{ color: '#C62828' }} />}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Patients</span>
                <span className="font-semibold">{r.n.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dropout Rate</span>
                <span className="font-mono">{(r.baselineDropout*100).toFixed(1)}% → {(r.newDropout*100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Waste Recovered</span>
                <span className="font-semibold text-green-700">{fmt$(r.wasteRecovered)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Intervention Cost</span>
                <span className="font-semibold text-orange-600">−{fmt$(r.interventionCost)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700">Net Saving</span>
                <span className="font-semibold font-mono" style={{ color: r.roiPositive ? '#2E7D32' : '#C62828' }}>
                  {r.roiPositive ? '+' : ''}{fmt$(r.netSaving)}
                </span>
              </div>
            </div>
            {!r.roiPositive && (
              <div className="mt-3 text-[10px] text-orange-600 bg-orange-50 rounded-lg p-2 leading-relaxed">
                ⚠ ROI negative at this intervention cost. Dropout rate too low for this segment to justify investment.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cumulative impact chart */}
      <div className="card p-5">
        <SectionHeader title="12-Month Cumulative Net Impact" sub="Projected savings trajectory with intervention vs baseline" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="savingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={totalNet>0?'#43A047':'#EF5350'} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={totalNet>0?'#43A047':'#EF5350'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={v => v===0?'Start':`M${v}`} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => fmt$(v)} tick={{ fontSize: 11 }} />
            {breakEvenMonth && breakEvenMonth <= 12 && (
              <ReferenceLine x={breakEvenMonth} stroke="#1B4F8A" strokeDasharray="5 3"
                label={{ value: `Break-even M${breakEvenMonth}`, position: 'top', fontSize: 9, fill: '#1B4F8A' }} />
            )}
            <ReferenceLine y={0} stroke="#CBD5E0" />
            <Tooltip formatter={v => [fmt$(v), '']} labelFormatter={v => v===0?'Start':`Month ${v}`} />
            <Area type="monotone" dataKey="withIntervention" name="With Intervention"
              stroke={totalNet>0?'#43A047':'#EF5350'} fill="url(#savingGrad)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="baseline" name="No Intervention" stroke="#CBD5E0" fill="none" strokeDasharray="5 3" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 text-[11px] text-gray-500">
          Assumes savings accrue linearly over 12 months. Intervention cost charged upfront in month 1.
          {breakEvenMonth && breakEvenMonth <= 12 ? ` Break-even achieved at month ${breakEvenMonth}.` : ' Adjust parameters to achieve positive ROI.'}
        </div>
      </div>
    </div>
  );
}
