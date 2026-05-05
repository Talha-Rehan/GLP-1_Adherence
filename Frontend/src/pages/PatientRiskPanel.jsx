import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { RiskBadge, PredictionPill, SegmentDot } from '../components/shared';
import { patients, SEGMENT_SHORT } from '../data/mockData';

const PAGE_SIZE = 20;
const MOLECULES = ['All', 'SEMAGLUTIDE', 'TIRZEPATIDE', 'LIRAGLUTIDE', 'DULAGLUTIDE'];
const SEGMENTS  = ['All', ...SEGMENT_SHORT];

const isFinancial = (driver) =>
  driver.toLowerCase().includes('financial') ||
  driver.toLowerCase().includes('out-of-pocket') ||
  driver.toLowerCase().includes('cost');

export default function PatientRiskPanel() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState('');
  const [segFilter, setSegFilter]     = useState('All');
  const [molFilter, setMolFilter]     = useState('All');
  const [minRisk, setMinRisk]         = useState(0);
  const [predFilter, setPredFilter]   = useState('All');
  const [financialOnly, setFinancialOnly] = useState(false);
  const [sortKey, setSortKey]         = useState('dropout_prob');
  const [sortDir, setSortDir]         = useState('desc');
  const [page, setPage]               = useState(0);

  const filtered = useMemo(() => {
    let d = [...patients];
    if (search)          d = d.filter(p => String(p.patient_idx).includes(search) || p.driver_1.toLowerCase().includes(search.toLowerCase()));
    if (segFilter !== 'All') d = d.filter(p => SEGMENT_SHORT[p.cluster] === segFilter);
    if (molFilter !== 'All') d = d.filter(p => p.assigned_molecule === molFilter);
    if (predFilter !== 'All') d = d.filter(p => p.prediction === predFilter);
    if (financialOnly)   d = d.filter(p => isFinancial(p.driver_1));
    d = d.filter(p => p.dropout_prob * 100 >= minRisk);
    d.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return d;
  }, [search, segFilter, molFilter, predFilter, financialOnly, minRisk, sortKey, sortDir]);

  const pages      = Math.ceil(filtered.length / PAGE_SIZE);
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const highRisk   = filtered.filter(p => p.dropout_prob >= 0.75).length;
  const financial  = filtered.filter(p => isFinancial(p.driver_1)).length;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-gray-700 whitespace-nowrap">
      {label}
      {sortKey === k && <ArrowUpDown size={11} style={{ opacity: 0.6 }} />}
    </button>
  );

  const resetFilters = () => {
    setSearch(''); setSegFilter('All'); setMolFilter('All');
    setPredFilter('All'); setFinancialOnly(false); setMinRisk(0); setPage(0);
  };

  return (
    <div className="max-w-[1320px] mx-auto flex gap-5 animate-fade-in">

      {/* ── Filter sidebar ──────────────────────────────────────── */}
      <aside className="flex-shrink-0 w-56 space-y-4">
        <div className="card p-4 space-y-4">
          <div className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Filter size={14} /> Filters
          </div>

          <div>
            <label className="label-xs">Segment</label>
            <select value={segFilter} onChange={e => { setSegFilter(e.target.value); setPage(0); }}
              className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {SEGMENTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="label-xs">Molecule</label>
            <select value={molFilter} onChange={e => { setMolFilter(e.target.value); setPage(0); }}
              className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {MOLECULES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="label-xs">Prediction</label>
            <select value={predFilter} onChange={e => { setPredFilter(e.target.value); setPage(0); }}
              className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {['All', 'Dropout Risk', 'Likely Adherent'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="label-xs">
              Min Risk Score: <span className="font-mono text-blue-600 ml-1">{minRisk}%</span>
            </label>
            <input type="range" min={0} max={90} step={5} value={minRisk}
              onChange={e => { setMinRisk(+e.target.value); setPage(0); }} />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0%</span><span>90%</span>
            </div>
          </div>

          {/* Financial barrier toggle */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" checked={financialOnly}
                  onChange={e => { setFinancialOnly(e.target.checked); setPage(0); }}
                  className="sr-only" />
                <div className="w-8 h-4 rounded-full transition-colors"
                     style={{ background: financialOnly ? 'var(--color-primary)' : '#CBD5E0' }} />
                <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
                     style={{ transform: financialOnly ? 'translateX(16px)' : 'none' }} />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign size={11} className="text-orange-500" />
                  Financial cases only
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Top driver = financial barrier
                </div>
              </div>
            </label>
          </div>

          <button onClick={resetFilters}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            Reset Filters
          </button>
        </div>

        {/* Risk legend */}
        <div className="card p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-600 mb-2">Risk Legend</div>
          {[
            ['≥75%', 'Critical', 'risk-critical'],
            ['50–74%', 'High',    'risk-high'],
            ['25–49%', 'Medium',  'risk-medium'],
            ['<25%',  'Low',      'risk-low'],
          ].map(([range, label, cls]) => (
            <div key={range} className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>{range}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main table ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Summary strip */}
        <div className="card px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 text-xs text-gray-600 flex-wrap">
            <span>Showing <b className="text-gray-800">{filtered.length}</b> patients</span>
            <span className="text-red-600 font-medium">
              {highRisk} high-risk (&gt;75%)
            </span>
            <span className="text-orange-600 font-medium">
              {financial} financial barrier cases
            </span>
            {financialOnly && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: '#FFF3E0', color: '#EF6C00' }}>
                Financial filter active
              </span>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search patients or drivers…"
              className="text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 w-52 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th><SortBtn k="dropout_prob" label="Risk Score" /></th>
                  <th>Prediction</th>
                  <th>Segment</th>
                  <th>Top Driver</th>
                  <th>Driver 2</th>
                  <th>Drug</th>
                  <th><SortBtn k="avg_oop_cost" label="OOP Cost" /></th>
                  <th><SortBtn k="BMXBMI" label="BMI" /></th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.patient_idx} className="cursor-pointer"
                      onClick={() => navigate(`/patients/${p.patient_idx}`)}>
                    <td><RiskBadge prob={p.dropout_prob} /></td>
                    <td><PredictionPill prediction={p.prediction} /></td>
                    <td><SegmentDot cluster={p.cluster} size="sm" /></td>

                    {/* Top driver */}
                    <td>
                      <div className="max-w-[190px]">
                        <div className="text-xs text-gray-700 truncate">{p.driver_1}</div>
                        <div className="text-[10px] mt-0.5 font-medium"
                             style={{ color: p.driver_1_direction.includes('increases') ? 'var(--risk-high)' : 'var(--color-positive)' }}>
                          {p.driver_1_direction.includes('increases') ? '↑' : '↓'} {p.driver_1_direction}
                        </div>
                      </div>
                    </td>

                    {/* Driver 2 */}
                    <td>
                      <div className="max-w-[160px]">
                        <div className="text-xs text-gray-500 truncate">{p.driver_2}</div>
                        <div className="text-[10px] mt-0.5"
                             style={{ color: p.driver_2_direction.includes('increases') ? '#EF6C00' : '#718096' }}>
                          {p.driver_2_direction.includes('increases') ? '↑' : '↓'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.assigned_molecule.slice(0, 4)}
                      </span>
                    </td>
                    <td><span className="font-mono text-xs">${p.avg_oop_cost.toFixed(0)}</span></td>
                    <td><span className="font-mono text-xs">{p.BMXBMI}</span></td>
                    <td>
                      <button
                        className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                        style={{ background: '#EBF4FF', color: '#1B4F8A' }}
                        onClick={e => { e.stopPropagation(); navigate(`/patients/${p.patient_idx}`); }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visible.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No patients match the current filters.
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {page + 1} of {Math.max(1, pages)}</span>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-blue-300 transition-colors">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => i + Math.max(0, page - 2))
                .filter(i => i < pages)
                .map(i => (
                  <button key={i} onClick={() => setPage(i)}
                    className="w-7 h-7 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: i === page ? 'var(--color-primary)' : '#E2E8F0',
                      background:  i === page ? 'var(--color-primary)' : 'white',
                      color:       i === page ? 'white' : '#4A5568',
                    }}>
                    {i + 1}
                  </button>
                ))}
              <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 disabled:opacity-30 hover:border-blue-300 transition-colors">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
