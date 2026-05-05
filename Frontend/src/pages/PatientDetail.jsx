import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { SHAPDriverCard, SegmentDot } from '../components/shared';
import { patients, survivalCurves, survivalCheckpoints, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/mockData';

const INTERPRETATIONS = {
  'Financial pressure relative to income': 'Out-of-pocket costs are high relative to income, creating financial pressure that commonly leads to discontinuation.',
  'Provider & pharmacy refill reliability': 'Refill reliability for this patient\'s provider is limited — supply disruptions increase dropout risk significantly.',
  'Blood sugar control (HbA1c)': 'HbA1c levels indicate the degree of clinical motivation. Higher values typically drive stronger resolve to continue therapy.',
  'Side effect intensity (GI friction)': 'GI side effect intensity for this molecule is elevated. Nausea and GI discomfort are the leading cause of early dropout.',
  'Body weight / BMI severity': 'BMI is a key clinical driver — patients with higher BMI typically see more visible results and remain more motivated.',
  'Out-of-pocket medication cost': 'High absolute drug cost creates a direct financial barrier to continued therapy.',
  'Overall disease burden': 'Higher comorbidity burden increases clinical urgency, which can either drive adherence or overwhelm the patient.',
};

const RECOMMENDATIONS = {
  'Financial pressure relative to income': { label: 'Copay Assistance', text: 'Connect patient to manufacturer copay assistance program. Average saving: $300–600/year.', color: '#EF6C00' },
  'Provider & pharmacy refill reliability': { label: 'Refill Check', text: 'Verify prior authorization status and confirm pharmacy refill continuity. Consider mail-order pharmacy.', color: '#1B4F8A' },
  'Side effect intensity (GI friction)': { label: 'Side Effect Check-in', text: 'Schedule a check-in call. Consider dose titration review or antiemetic support.', color: '#C62828' },
  'Blood sugar control (HbA1c)': { label: 'Clinical Monitoring', text: 'Standard monitoring sufficient. High HbA1c indicates strong clinical motivation to stay on therapy.', color: '#2E7D32' },
  'Out-of-pocket medication cost': { label: 'Cost Support', text: 'Explore patient assistance programs and generic alternatives if available.', color: '#EF6C00' },
  'Body weight / BMI severity': { label: 'Progress Tracking', text: 'Set clear weight milestone expectations. Stalled progress is a major dropout trigger.', color: '#1B4F8A' },
  'Overall disease burden': { label: 'Care Coordination', text: 'High comorbidity may require coordinated care. Ensure treatment plan is integrated.', color: '#1B4F8A' },
};

function RiskGauge({ prob }) {
  const pct = Math.round(prob * 100);
  const angle = -135 + (pct / 100) * 270;
  const color = pct >= 75 ? '#C62828' : pct >= 50 ? '#EF6C00' : pct >= 25 ? '#F9A825' : '#2E7D32';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 90" width="180" height="116">
        <path d="M 20 80 A 50 50 0 0 1 120 80" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round"/>
        <path d="M 20 80 A 50 50 0 0 1 120 80" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${(pct/100)*157} 157`}/>
        <g transform={`rotate(${angle} 70 80)`}>
          <line x1="70" y1="80" x2="70" y2="42" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="70" cy="80" r="4" fill={color}/>
        </g>
        <text x="70" y="75" textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: color, fontFamily: 'IBM Plex Mono' }}>{pct}%</text>
        <text x="70" y="87" textAnchor="middle" style={{ fontSize: 9, fill: '#718096' }}>Dropout Probability</text>
      </svg>
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find(p => p.patient_idx === +id) ?? patients[0];
  const segColor = SEGMENT_COLORS[patient.cluster];
  const rec = RECOMMENDATIONS[patient.driver_1] ?? RECOMMENDATIONS['Blood sugar control (HbA1c)'];
  const checkpoint = survivalCheckpoints[patient.cluster];

  // Mini KM data
  const miniKM = survivalCurves.map(sc => ({
    ...sc,
    highlighted: sc.cluster === patient.cluster,
    data: sc.data,
  }));

  const bmiFriction = patient.bio_friction < 0.30 ? 'Low side effect risk' : patient.bio_friction < 0.45 ? 'Moderate side effect risk' : 'High side effect risk — monitor for GI complaints';
  const hba1cLabel = patient.LBXGH < 5.7 ? 'Normal' : patient.LBXGH < 6.5 ? 'Pre-diabetic' : 'Diabetic range';

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Patient Risk Panel
      </button>

      <div className="grid grid-cols-3 gap-5">
        {/* Col 1 — Profile */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                   style={{ background: segColor }}>{patient.patient_idx}</div>
              <div>
                <div className="font-semibold text-gray-800">Patient #{patient.patient_idx}</div>
                <SegmentDot cluster={patient.cluster} size="sm" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clinical</div>
              {[
                ['Age', `${patient.RIDAGEYR} years`],
                ['BMI', `${patient.BMXBMI} kg/m²`],
                ['HbA1c', `${patient.LBXGH}% (${hba1cLabel})`],
                ['Comorbidities', `${patient.comorbidity_score}/2`],
                ['Drug Generation', `Gen ${patient.drug_generation} · ${patient.assigned_molecule}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[130px]">{val}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Financial</div>
                {[
                  ['OOP Cost', `$${patient.avg_oop_cost}/mo`],
                  ['Cost Pressure', `${patient.income_cost_pressure.toFixed(1)} index`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{val}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Side Effects</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bio Friction</span>
                  <span className="font-medium" style={{ color: patient.bio_friction > 0.45 ? '#C62828' : patient.bio_friction > 0.30 ? '#EF6C00' : '#2E7D32' }}>
                    {patient.bio_friction.toFixed(3)}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{bmiFriction}</div>
              </div>
            </div>
          </div>

          {/* Recommended action */}
          <div className="card p-4 border-l-4" style={{ borderLeftColor: rec.color }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: rec.color }}>
              Recommended Action: {rec.label}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">{rec.text}</div>
          </div>
        </div>

        {/* Col 2 — SHAP Risk */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dropout Risk Assessment</div>
            <RiskGauge prob={patient.dropout_prob} />
            <div className="text-center mt-1 mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: patient.prediction === 'Dropout Risk' ? '#FFEBEE' : '#E8F5E9',
                             color: patient.prediction === 'Dropout Risk' ? '#C62828' : '#2E7D32' }}>
                {patient.prediction === 'Dropout Risk' ? <AlertTriangle size={13}/> : <CheckCircle size={13}/>}
                {patient.prediction}
              </span>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Dropout Drivers</div>
            <div className="space-y-2.5">
              {[
                { driver: patient.driver_1, direction: patient.driver_1_direction, shap: patient.driver_1_shap },
                { driver: patient.driver_2, direction: patient.driver_2_direction, shap: patient.driver_2_shap },
                { driver: patient.driver_3, direction: patient.driver_3_direction, shap: patient.driver_3_shap },
              ].map((d, i) => (
                <SHAPDriverCard key={i} rank={i+1} {...d} delay={i*0.06} />
              ))}
            </div>
          </div>
          {/* Interpretation */}
          <div className="card p-4" style={{ background: '#F7FAFC' }}>
            <div className="text-xs font-semibold text-gray-500 mb-2">Why is this patient flagged?</div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {INTERPRETATIONS[patient.driver_1] ?? 'Multiple clinical and financial factors are contributing to elevated dropout risk for this patient.'}
            </p>
          </div>
        </div>

        {/* Col 3 — Survival context */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Survival Curve — This Segment</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="day" type="number" domain={[0,180]} ticks={[0,30,60,90,180]} tick={{ fontSize: 9 }} />
                <YAxis domain={[0,1]} tickFormatter={v=>`${Math.round(v*100)}%`} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => `${(v*100).toFixed(0)}%`} />
                {miniKM.map(sc => (
                  <Line key={sc.cluster} data={sc.data} dataKey="survival" dot={false}
                    stroke={sc.highlighted ? SEGMENT_COLORS[sc.cluster] : '#E2E8F0'}
                    strokeWidth={sc.highlighted ? 2.5 : 1} name={sc.label} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="text-[10px] text-gray-400 text-center mt-1">Highlighted = patient's segment</div>
          </div>

          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dropout Rates — This Segment</div>
            <div className="space-y-2">
              {[['30', checkpoint.day30], ['60', checkpoint.day60], ['90', checkpoint.day90], ['180', checkpoint.day180]].map(([day, rate]) => {
                const pct = rate * 100;
                const barColor = pct >= 60 ? '#EF5350' : pct >= 35 ? '#FF7043' : '#43A047';
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">Day {day}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-700 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-gray-500 leading-relaxed" style={{ background: '#F7FAFC', borderRadius: 8, padding: '8px 10px' }}>
              In the <b>{SEGMENT_LABELS[patient.cluster]}</b> segment, {Math.round(checkpoint.day90 * 100)}% of patients have discontinued therapy by day 90.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
