import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { SegmentDot } from '../components/shared';
import { patients, survivalCurves, survivalCheckpoints, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/mockData';

// ── Plain-language interpretations keyed by driver label ──────────────────────
const INTERPRETATIONS = {
  'Financial pressure relative to income':
    'Out-of-pocket costs are high relative to income, creating financial pressure that commonly leads to discontinuation.',
  'Provider & pharmacy refill reliability':
    "Refill reliability for this patient's provider network is limited — supply disruptions significantly increase dropout risk.",
  'Blood sugar control (HbA1c)':
    'HbA1c level indicates the degree of clinical motivation. Higher uncontrolled values typically drive stronger resolve to continue therapy.',
  'Side effect intensity (GI friction)':
    'GI side effect intensity for this molecule is elevated. Nausea and GI discomfort are the leading cause of early discontinuation.',
  'Body weight / BMI severity':
    'Higher BMI patients typically see more visible early results, improving motivation — but stalled progress can become a dropout trigger.',
  'Out-of-pocket medication cost':
    'High absolute drug cost creates a direct, ongoing financial barrier to continued therapy.',
  'Overall disease burden':
    'Higher comorbidity burden increases clinical urgency, which can drive adherence — but also overwhelm the patient.',
};

// ── Action recommendations keyed by driver label ──────────────────────────────
const RECOMMENDATIONS = {
  'Financial pressure relative to income': {
    label: 'Copay Assistance',
    text:  'Connect patient to manufacturer copay assistance program. Average saving: $300–600/year.',
    color: '#EF6C00',
  },
  'Provider & pharmacy refill reliability': {
    label: 'Refill Continuity Check',
    text:  'Verify prior authorization status and confirm pharmacy refill continuity. Consider mail-order pharmacy.',
    color: '#1B4F8A',
  },
  'Side effect intensity (GI friction)': {
    label: 'Side Effect Check-in',
    text:  'Schedule a check-in call. Consider dose titration review or antiemetic support.',
    color: '#C62828',
  },
  'Blood sugar control (HbA1c)': {
    label: 'Standard Monitoring',
    text:  'High HbA1c indicates strong clinical motivation. Standard monitoring is sufficient.',
    color: '#2E7D32',
  },
  'Out-of-pocket medication cost': {
    label: 'Cost Support',
    text:  'Explore patient assistance programs and formulary alternatives.',
    color: '#EF6C00',
  },
  'Body weight / BMI severity': {
    label: 'Progress Milestone Review',
    text:  'Set clear weight milestone expectations. Stalled progress is a major dropout trigger — early re-engagement matters.',
    color: '#1B4F8A',
  },
  'Overall disease burden': {
    label: 'Care Coordination',
    text:  'High comorbidity may require coordinated care. Ensure treatment plan is integrated across providers.',
    color: '#1B4F8A',
  },
};

// ── Semi-circle dropout probability gauge ────────────────────────────────────
function RiskGauge({ prob }) {
  const pct   = Math.round(prob * 100);
  const color = pct >= 75 ? '#C62828' : pct >= 50 ? '#EF6C00' : pct >= 25 ? '#F9A825' : '#2E7D32';
  // Arc: from (-π) to (0) i.e. left to right over the top
  // Full arc circumference for r=50 semicircle ≈ π*50 ≈ 157.08
  const arcLen = 157.08;
  const filled = (pct / 100) * arcLen;
  // Needle: 0% → points left (−90° from top i.e. −135° from default), 100% → points right (+45°)
  const needleAngle = -135 + (pct / 100) * 270;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" width="200" height="125">
        {/* Track */}
        <path d="M 20 85 A 60 60 0 0 1 140 85"
              fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
        {/* Fill */}
        <path d="M 20 85 A 60 60 0 0 1 140 85"
              fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 188.5} 188.5`} />
        {/* Needle */}
        <g transform={`rotate(${needleAngle} 80 85)`}>
          <line x1="80" y1="85" x2="80" y2="38" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="80" cy="85" r="5" fill={color} />
        </g>
        {/* Label */}
        <text x="80" y="80" textAnchor="middle"
              style={{ fontSize: 24, fontWeight: 700, fill: color, fontFamily: 'IBM Plex Mono' }}>
          {pct}%
        </text>
        <text x="80" y="95" textAnchor="middle"
              style={{ fontSize: 9, fill: '#718096' }}>
          Dropout Probability
        </text>
      </svg>
    </div>
  );
}

// ── Single SHAP driver row ───────────────────────────────────────────────────
function DriverRow({ rank, driver, direction, shap }) {
  const isRisk  = direction?.includes('increases');
  const color   = isRisk ? 'var(--risk-high)' : 'var(--color-positive)';
  const bgColor = isRisk ? '#FFF3E0' : '#F0FDF4';
  const maxSHAP = 0.5;
  const barWidth = Math.min(100, (Math.abs(shap ?? 0) / maxSHAP) * 100);

  return (
    <div className="p-3 rounded-xl" style={{ background: bgColor }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white"
                style={{ color }}>
            {rank}
          </span>
          <span className="text-xs font-medium text-gray-700 leading-snug">{driver}</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full bg-white flex-shrink-0"
              style={{ color }}>
          {isRisk ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {isRisk ? 'Increasing risk' : 'Reducing risk'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${barWidth}%`, background: color }} />
        </div>
        <span className="text-[10px] font-mono text-gray-400 w-10 text-right flex-shrink-0">
          {Math.abs(shap ?? 0).toFixed(3)}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PatientDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const patient  = patients.find(p => p.patient_idx === +id) ?? patients[0];
  const segColor = SEGMENT_COLORS[patient.cluster];
  const rec      = RECOMMENDATIONS[patient.driver_1] ?? RECOMMENDATIONS['Blood sugar control (HbA1c)'];
  const checkpoint = survivalCheckpoints[patient.cluster];

  const miniKM = survivalCurves.map(sc => ({
    ...sc,
    highlighted: sc.cluster === patient.cluster,
  }));

  const frictionLabel =
    patient.bio_friction < 0.30 ? 'Low side effect risk' :
    patient.bio_friction < 0.45 ? 'Moderate side effect risk' :
    'High side effect risk — monitor for GI complaints';

  const hba1cLabel =
    patient.LBXGH < 5.7  ? 'Normal' :
    patient.LBXGH < 6.5  ? 'Pre-diabetic' : 'Diabetic range';

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Patient Risk Panel
      </button>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Col 1 — Patient profile ─────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                   style={{ background: segColor }}>
                {patient.patient_idx}
              </div>
              <div>
                <div className="font-semibold text-gray-800">Patient #{patient.patient_idx}</div>
                <SegmentDot cluster={patient.cluster} size="sm" />
              </div>
            </div>

            {/* Clinical fields */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Clinical</div>
            <div className="space-y-2.5 mb-4">
              {[
                ['Age',            `${patient.RIDAGEYR} years`],
                ['BMI',            `${patient.BMXBMI} kg/m²`],
                ['HbA1c',          `${patient.LBXGH}% (${hba1cLabel})`],
                ['Comorbidities',  `${patient.comorbidity_score} / 2`],
                ['Drug',           `Gen ${patient.drug_generation} · ${patient.assigned_molecule}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[140px]">{val}</span>
                </div>
              ))}
            </div>

            {/* Financial fields */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-t border-gray-100 pt-3">Financial</div>
            <div className="space-y-2.5 mb-4">
              {[
                ['OOP Cost',       `$${patient.avg_oop_cost}/mo`],
                ['Cost Pressure',  `${patient.income_cost_pressure.toFixed(1)} index`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{val}</span>
                </div>
              ))}
            </div>

            {/* Side effects */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-t border-gray-100 pt-3">Side Effects</div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Bio Friction</span>
              <span className="font-semibold font-mono"
                    style={{ color: patient.bio_friction > 0.45 ? '#C62828' : patient.bio_friction > 0.30 ? '#EF6C00' : '#2E7D32' }}>
                {patient.bio_friction.toFixed(3)}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#E2E8F0' }}>
              <div className="h-full rounded-full"
                   style={{
                     width: `${(patient.bio_friction / 0.7) * 100}%`,
                     background: patient.bio_friction > 0.45 ? '#C62828' : patient.bio_friction > 0.30 ? '#EF6C00' : '#2E7D32',
                   }} />
            </div>
            <div className="text-[11px] text-gray-400">{frictionLabel}</div>
          </div>

          {/* Recommended action */}
          <div className="card p-4 border-l-4" style={{ borderLeftColor: rec.color }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: rec.color }}>
              Recommended: {rec.label}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{rec.text}</p>
          </div>
        </div>

        {/* ── Col 2 — SHAP risk explanation ─────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
              Dropout Risk Assessment
            </div>

            <RiskGauge prob={patient.dropout_prob} />

            <div className="text-center mt-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: patient.prediction === 'Dropout Risk' ? '#FFEBEE' : '#E8F5E9',
                      color:      patient.prediction === 'Dropout Risk' ? '#C62828' : '#2E7D32',
                    }}>
                {patient.prediction === 'Dropout Risk'
                  ? <AlertTriangle size={13} />
                  : <CheckCircle  size={13} />}
                {patient.prediction}
              </span>
            </div>

            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Top Dropout Drivers
            </div>
            <div className="space-y-2">
              {[
                { driver: patient.driver_1, direction: patient.driver_1_direction, shap: patient.driver_1_shap },
                { driver: patient.driver_2, direction: patient.driver_2_direction, shap: patient.driver_2_shap },
                { driver: patient.driver_3, direction: patient.driver_3_direction, shap: patient.driver_3_shap },
              ].map((d, i) => (
                <DriverRow key={i} rank={i + 1} {...d} />
              ))}
            </div>
          </div>

          {/* Driver interpretation */}
          <div className="card p-4" style={{ background: '#F7FAFC' }}>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Why is this patient flagged?
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {INTERPRETATIONS[patient.driver_1] ??
                'Multiple clinical and financial factors are contributing to elevated dropout risk.'}
            </p>
          </div>
        </div>

        {/* ── Col 3 — Survival & segment context ────────────────── */}
        <div className="space-y-4">
          {/* Mini KM */}
          <div className="card p-5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Survival Curve — This Segment
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="day" type="number" domain={[0, 180]}
                  ticks={[0, 30, 60, 90, 180]} tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 9 }} />
                <Tooltip formatter={v => `${(v * 100).toFixed(0)}%`}
                  labelFormatter={v => `Day ${v}`} />
                {miniKM.map(sc => (
                  <Line key={sc.cluster} data={sc.data} dataKey="survival" dot={false}
                    stroke={sc.highlighted ? SEGMENT_COLORS[sc.cluster] : '#E2E8F0'}
                    strokeWidth={sc.highlighted ? 2.5 : 1}
                    name={sc.label} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="text-[10px] text-gray-400 text-center mt-1">
              Highlighted = patient's segment ·{' '}
              <span style={{ color: segColor }}>
                {SEGMENT_LABELS[patient.cluster].split(' ').slice(0, 3).join(' ')}
              </span>
            </div>
          </div>

          {/* Dropout checkpoint rates */}
          <div className="card p-5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              Segment Dropout Rates
            </div>
            <div className="space-y-2.5">
              {[
                ['30', checkpoint.day30],
                ['60', checkpoint.day60],
                ['90', checkpoint.day90],
                ['180', checkpoint.day180],
              ].map(([day, rate]) => {
                const pct      = rate * 100;
                const barColor = pct >= 60 ? '#EF5350' : pct >= 35 ? '#FF7043' : '#43A047';
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-14 flex-shrink-0">Day {day}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700 w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-[11px] text-gray-500 leading-relaxed px-3 py-2.5 rounded-lg"
                 style={{ background: '#F7FAFC', border: '1px solid #E2E8F0' }}>
              In the <b>{SEGMENT_LABELS[patient.cluster]}</b> segment,{' '}
              {Math.round(checkpoint.day90 * 100)}% of patients have discontinued therapy by day 90.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
