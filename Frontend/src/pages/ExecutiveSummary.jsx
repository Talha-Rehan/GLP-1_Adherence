import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, DollarSign, Users, TrendingDown, AlertTriangle, BarChart2 } from 'lucide-react';
import { KPICard, SectionHeader, ChartTooltip, SHAPDriverCard } from '../components/shared';
import { summaryKPIs, adherenceBySegment, globalSHAPDrivers, dropoutByWindow, SEGMENT_COLORS } from '../data/mockData';
import { useRole } from '../context/RoleContext';

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${n.toLocaleString()}`;

export default function ExecutiveSummary() {
  const { isInsurer } = useRole();
  const donutData = [
    ...adherenceBySegment.map(s => ({ name: s.segment, value: Math.round(s.adherence * s.n), color: s.color, type: 'Adherent' })),
    ...adherenceBySegment.map(s => ({ name: s.segment, value: Math.round((1-s.adherence) * s.n), color: s.color+'88', type: 'Dropout' })),
  ];

  return (
    <div className="max-w-[1320px] mx-auto space-y-6">
      {isInsurer && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-up"
             style={{ background: '#EBF4FF', color: '#1B4F8A', border: '1px solid #BFDBFE' }}>
          <AlertTriangle size={15} /> Insurer View — Financial metrics and ROI analysis are foregrounded
        </div>
      )}

      {/* Zone A — KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Total Patients" value={summaryKPIs.totalPatients.toLocaleString()} icon={Users} color="#1B4F8A" delay={0} />
        <KPICard label="Overall Adherence" value={`${(summaryKPIs.adherenceRate*100).toFixed(0)}%`} icon={Activity}
          sub="vs 47% published benchmark" trend={0} trendLabel="Aligned with benchmark" color="#2E7D32" delay={0.05} />
        <KPICard label="Population Dropout" value={`${(summaryKPIs.dropoutRate*100).toFixed(0)}%`} icon={TrendingDown}
          sub="Patients discontinuing therapy" trend={-1} trendLabel="Above ideal" color="#C62828" delay={0.10} />
        <KPICard label="Avg Annual Drug Cost" value={`$${summaryKPIs.avgAnnualCost.toLocaleString()}`} icon={DollarSign}
          sub="Per patient per year" color="#EF6C00" delay={0.15} />
        <KPICard label="Est. Wasted Spend" value={fmt(summaryKPIs.wastedSpendAnnual)} icon={BarChart2}
          sub="Paid for patients who dropout" trend={-1} trendLabel="Opportunity for reduction" color="#C62828" delay={0.20} />
      </div>

      {/* Zone B */}
      <div className="grid grid-cols-2 gap-5">
        {/* Adherence donut */}
        <div className="card p-5 animate-fade-up stagger-3">
          <SectionHeader title="Adherence by Segment" sub="Click a segment to explore in detail" />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={adherenceBySegment} dataKey="adherence" cx="35%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
                {adherenceBySegment.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
              </Pie>
              <Pie data={adherenceBySegment.map(s=>({...s, value: 1-s.adherence}))} dataKey="value" cx="35%" cy="50%"
                outerRadius={52} innerRadius={30} paddingAngle={2}>
                {adherenceBySegment.map((s, i) => <Cell key={i} fill={`${s.color}55`} stroke="none" />)}
              </Pie>
              <text x="35%" y="50%" textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 20, fontWeight: 700, fill: '#1A202C', fontFamily: 'DM Serif Display' }}>47%</text>
              <text x="35%" y="50%" dy={20} textAnchor="middle"
                    style={{ fontSize: 11, fill: '#718096' }}>Adherent</text>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return <div className="card px-3 py-2 text-xs"><b>{d.segment}</b><br/>{(d.adherence*100).toFixed(0)}% adherent · n={d.n.toLocaleString()}</div>;
              }} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ fontSize: 11, color: '#4A5568' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Dropout rate bar */}
        <div className="card p-5 animate-fade-up stagger-4">
          <SectionHeader title="Dropout Rate by Segment" sub="Red line = 53% published real-world average" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={adherenceBySegment.map(s => ({ name: s.segment.split(' ').slice(0,2).join(' '), dropout: +((1-s.adherence)*100).toFixed(1), color: s.color }))}
              layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip formatter={v => `${v}%`} />} />
              <Bar dataKey="dropout" radius={[0, 4, 4, 0]} name="Dropout Rate">
                {adherenceBySegment.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone C */}
      <div className="grid grid-cols-2 gap-5">
        {/* Dropout windows */}
        <div className="card p-5 animate-fade-up stagger-5">
          <SectionHeader title="Dropout Volume by Time Window" sub="Estimated patients discontinuing at each checkpoint" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dropoutByWindow} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="window" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="seg0" name="Low Urgency" fill={SEGMENT_COLORS[0]} stackId="a" />
              <Bar dataKey="seg1" name="Financial Barrier" fill={SEGMENT_COLORS[1]} stackId="a" />
              <Bar dataKey="seg2" name="Low Friction" fill={SEGMENT_COLORS[2]} stackId="a" />
              <Bar dataKey="seg3" name="Moderate Risk" fill={SEGMENT_COLORS[3]} stackId="a" radius={[4,4,0,0]} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Global SHAP drivers or wasted spend (role-based) */}
        <div className="card p-5 animate-fade-up stagger-6">
          {isInsurer ? (
            <>
              <SectionHeader title="Wasted Spend by Segment" sub="Annual drug spend on patients who discontinue" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={adherenceBySegment.map(s => ({
                  name: s.segment.split(' ').slice(0,2).join(' '),
                  spend: Math.round((1-s.adherence) * s.n * 10603),
                }))} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={v => `$${v.toLocaleString()}`} />} />
                  <Bar dataKey="spend" name="Wasted Spend" radius={[0,4,4,0]}>
                    {adherenceBySegment.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <SectionHeader title="Top Population Dropout Drivers" sub="Mean absolute SHAP impact across all patients" />
              <div className="space-y-2 mt-1">
                {globalSHAPDrivers.slice(0, 6).map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-3 text-right flex-shrink-0">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-700 truncate">{d.feature}</span>
                        <span className="text-xs font-mono font-semibold text-gray-500 ml-2">{d.importance.toFixed(3)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                        <div className="h-full rounded-full" style={{ width: `${(d.importance/0.55)*100}%`, background: `hsl(${220 - i*20},65%,45%)` }} />
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
