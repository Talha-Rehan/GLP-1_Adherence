import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Activity, DollarSign, Users, TrendingDown, AlertTriangle, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KPICard, SectionHeader, ChartTooltip } from '../components/shared';
import {
  summaryKPIs, adherenceBySegment, globalSHAPDrivers,
  dropoutByWindow, SEGMENT_COLORS, patients,
} from '../data/mockData';
import { useRole } from '../context/RoleContext';

const fmt = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`;

export default function ExecutiveSummary() {
  const { isInsurer } = useRole();
  const navigate = useNavigate();

  // Case-manager alert: patients with dropout_prob ≥ 0.85
  const highRiskCount = patients.filter(p => p.dropout_prob >= 0.85).length;

  // Outer ring: overall Adherent vs Dropout (2 slices)
  const outerRing = [
    { name: 'Adherent',  value: Math.round(summaryKPIs.adherenceRate * summaryKPIs.totalPatients), color: '#2E7D32' },
    { name: 'Dropout',   value: Math.round(summaryKPIs.dropoutRate  * summaryKPIs.totalPatients), color: '#E2E8F0' },
  ];

  // Inner ring: 4 patient segments (population share)
  const innerRing = adherenceBySegment.map(s => ({ ...s, value: s.n }));

  // Dropout bar data
  const dropoutBarData = adherenceBySegment.map(s => ({
    name: s.segment.split(' ').slice(0, 2).join(' '),
    dropout: +((1 - s.adherence) * 100).toFixed(1),
    color: s.color,
  }));

  // Wasted spend bar data (insurer view)
  const wastedData = adherenceBySegment.map(s => ({
    name: s.segment.split(' ').slice(0, 2).join(' '),
    spend: Math.round((1 - s.adherence) * s.n * summaryKPIs.avgAnnualCost),
  }));

  const maxImp = globalSHAPDrivers[0].importance;

  return (
    <div className="max-w-[1320px] mx-auto space-y-5">

      {/* ── Alert banners ─────────────────────────────────────────── */}
      {!isInsurer && highRiskCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-up"
             style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}>
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span>
            <b>{highRiskCount} high-risk patients</b> have a dropout probability &gt;85% and need
            immediate attention.
          </span>
          <button
            onClick={() => navigate('/patients')}
            className="ml-auto text-xs font-semibold underline underline-offset-2 hover:opacity-70 whitespace-nowrap">
            View patients →
          </button>
        </div>
      )}

      {isInsurer && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-up"
             style={{ background: '#EBF4FF', color: '#1B4F8A', border: '1px solid #BFDBFE' }}>
          <AlertTriangle size={15} className="flex-shrink-0" />
          Insurer View — Financial metrics and ROI analysis are foregrounded.
        </div>
      )}

      {/* ── Zone A — KPI strip ────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Total Patients"     value={summaryKPIs.totalPatients.toLocaleString()}
          icon={Users} color="#1B4F8A" delay={0} />
        <KPICard label="Overall Adherence"  value={`${(summaryKPIs.adherenceRate * 100).toFixed(0)}%`}
          icon={Activity} sub="vs 47% published benchmark" trend={0}
          trendLabel="Aligned with benchmark" color="#2E7D32" delay={0.05} />
        <KPICard label="Population Dropout" value={`${(summaryKPIs.dropoutRate * 100).toFixed(0)}%`}
          icon={TrendingDown} sub="Patients discontinuing therapy" trend={-1}
          trendLabel="Above ideal" color="#C62828" delay={0.10} />
        <KPICard label="Avg Annual Drug Cost" value={`$${summaryKPIs.avgAnnualCost.toLocaleString()}`}
          icon={DollarSign} sub="Per patient per year" color="#EF6C00" delay={0.15} />
        <KPICard label="Est. Wasted Spend"  value={fmt(summaryKPIs.wastedSpendAnnual)}
          icon={BarChart2} sub="Paid for patients who dropout" trend={-1}
          trendLabel="Opportunity for reduction" color="#C62828" delay={0.20} />
      </div>

      {/* ── Zone B ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Adherence donut — outer = 2-slice split, inner = 4 segments */}
        <div className="card p-5 animate-fade-up stagger-3">
          <SectionHeader
            title="Adherence by Segment"
            sub="Outer ring: overall split · Inner ring: segments (click to explore)" />
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              {/* Outer ring: Adherent vs Dropout */}
              <Pie data={outerRing} dataKey="value" cx="38%" cy="50%"
                outerRadius={102} innerRadius={84} paddingAngle={1}
                isAnimationActive={false}>
                {outerRing.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>

              {/* Inner ring: 4 segments, clickable */}
              <Pie data={innerRing} dataKey="value" cx="38%" cy="50%"
                outerRadius={80} innerRadius={54} paddingAngle={2}
                onClick={() => navigate('/segments')}
                style={{ cursor: 'pointer' }}
                isAnimationActive={false}>
                {innerRing.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>

              {/* Center label */}
              <text x="38%" y="46%" textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 22, fontWeight: 700, fill: '#1A202C', fontFamily: 'DM Serif Display' }}>
                47%
              </text>
              <text x="38%" y="59%" textAnchor="middle"
                    style={{ fontSize: 10, fill: '#718096' }}>
                Adherent
              </text>

              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                const total = summaryKPIs.totalPatients;
                return (
                  <div className="card px-3 py-2 text-xs shadow-md">
                    <b>{d.name ?? d.segment}</b><br />
                    {d.cluster !== undefined
                      ? `n = ${d.value.toLocaleString()} · ${(d.adherence * 100).toFixed(0)}% adherent`
                      : `${((d.value / total) * 100).toFixed(0)}% of population`}
                  </div>
                );
              }} />

              <Legend layout="vertical" align="right" verticalAlign="middle"
                iconType="circle" iconSize={8}
                payload={innerRing.map(d => ({ value: d.segment, color: d.color, type: 'circle' }))}
                formatter={v => <span style={{ fontSize: 10, color: '#4A5568' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Dropout rate bar + 53% benchmark reference line */}
        <div className="card p-5 animate-fade-up stagger-4">
          <SectionHeader
            title="Dropout Rate by Segment"
            sub="Dashed line = 53% published real-world benchmark" />
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dropoutBarData} layout="vertical"
              margin={{ left: 0, right: 52, top: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip formatter={v => `${v}%`} />} />
              <ReferenceLine x={53} stroke="#EF5350" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: '53% avg', position: 'right', fontSize: 9, fill: '#EF5350' }} />
              <Bar dataKey="dropout" radius={[0, 4, 4, 0]} name="Dropout Rate">
                {adherenceBySegment.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Zone C ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Dropout volume by time window */}
        <div className="card p-5 animate-fade-up stagger-5">
          <SectionHeader
            title="Dropout Volume by Time Window"
            sub="Estimated patients discontinuing at each checkpoint" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dropoutByWindow} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="window" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="seg0" name="Low Urgency"       fill={SEGMENT_COLORS[0]} stackId="a" />
              <Bar dataKey="seg1" name="Financial Barrier" fill={SEGMENT_COLORS[1]} stackId="a" />
              <Bar dataKey="seg2" name="Low Friction"      fill={SEGMENT_COLORS[2]} stackId="a" />
              <Bar dataKey="seg3" name="Moderate Risk"     fill={SEGMENT_COLORS[3]} stackId="a" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8}
                formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role-dependent right panel */}
        <div className="card p-5 animate-fade-up stagger-6">
          {isInsurer ? (
            <>
              <SectionHeader
                title="Wasted Spend by Segment"
                sub="Annual drug spend on patients who discontinue" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={wastedData} layout="vertical"
                  margin={{ left: 0, right: 36, top: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={v => `$${v.toLocaleString()}`} />} />
                  <Bar dataKey="spend" name="Wasted Spend" radius={[0, 4, 4, 0]}>
                    {adherenceBySegment.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <SectionHeader
                title="Top Population Dropout Drivers"
                sub="Mean absolute SHAP impact across all patients" />
              <div className="space-y-3 mt-2">
                {globalSHAPDrivers.slice(0, 6).map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400 w-4 text-right flex-shrink-0 font-mono">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 truncate pr-2">{d.feature}</span>
                        <span className="text-[11px] font-mono font-semibold text-gray-500 flex-shrink-0">
                          {d.importance.toFixed(3)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                        <div className="h-full rounded-full"
                             style={{
                               width: `${(d.importance / maxImp) * 100}%`,
                               background: `hsl(${215 - i * 15}, 65%, ${46 + i * 2}%)`,
                             }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
