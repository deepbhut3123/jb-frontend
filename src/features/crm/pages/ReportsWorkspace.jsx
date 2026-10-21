import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Download, Eye, FileText, Search, UsersRound } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingButton from '../../../components/LoadingButton.jsx';
import { api } from '../../../services/api.js';

const dateInput = (date) => { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10); };
function presetRange(preset) {
  if (preset === 'all') return { dateFrom: '', dateTo: '' };
  const today = new Date(); const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (preset === 'month') start.setDate(1);
  if (preset === 'year') { start.setMonth(0); start.setDate(1); }
  return { dateFrom: dateInput(start), dateTo: dateInput(today) };
}
function displayValue(value, type) {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'date') { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  if (type === 'currency') return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
  if (type === 'percent') return `${Number(value) || 0}%`;
  if (type === 'number') return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  return String(value);
}

export default function ReportsWorkspace({ token }) {
  const [modules, setModules] = useState([]);
  const [moduleKey, setModuleKey] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [period, setPeriod] = useState('month');
  const [range, setRange] = useState(() => presetRange('month'));
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const selectedModule = useMemo(() => modules.find((item) => item.key === moduleKey), [moduleKey, modules]);
  const filteredOptions = useMemo(() => { const query = search.trim().toLowerCase(); return query ? options.filter((item) => `${item.label} ${item.subtitle}`.toLowerCase().includes(query)) : options; }, [options, search]);

  useEffect(() => { api.reportCatalog(token).then(({ modules: list = [] }) => { setModules(list); if (list.length) setModuleKey(list[0].key); }).catch((error) => toast.error(error.message)); }, [token]);
  useEffect(() => {
    if (!moduleKey) return undefined;
    let active = true; setLoadingOptions(true); setOptions([]); setSelectedIds([]); setSelectedReports([]); setSearch(''); setPreview(null);
    api.reportOptions(token, moduleKey).then(({ options: list = [] }) => { if (active) setOptions(list); }).catch((error) => { if (active) toast.error(error.message); }).finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, [moduleKey, token]);

  function toggleRecord(optionId) { setSelectedIds((current) => current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]); setPreview(null); }
  function toggleReport(reportKey) { setSelectedReports((current) => current.includes(reportKey) ? current.filter((item) => item !== reportKey) : [...current, reportKey]); setPreview(null); }
  function changePeriod(next) { setPeriod(next); if (next !== 'custom') setRange(presetRange(next)); setPreview(null); }
  async function generatePreview() {
    if (!selectedIds.length) return toast.error(`Select at least one ${selectedModule?.singular || 'record'}.`);
    if (!selectedReports.length) return toast.error('Select at least one type of information.');
    if (period === 'custom' && (!range.dateFrom || !range.dateTo)) return toast.error('Select both custom dates.');
    if (range.dateFrom && range.dateTo && range.dateFrom > range.dateTo) return toast.error('The start date cannot be after the end date.');
    setLoading(true);
    try { setPreview(await api.previewReport(token, { module: moduleKey, selectedIds, reports: selectedReports, ...range })); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }
  async function download() { try { const { downloadReportPdf } = await import('../../../utils/reportPdf.js'); downloadReportPdf(preview); toast.success('Report PDF downloaded.'); } catch (error) { toast.error(error.message || 'Could not create the PDF.'); } }
  const allVisibleSelected = filteredOptions.length > 0 && filteredOptions.every((item) => selectedIds.includes(item.id));

  return <div className="crm-content-inner reports-page">
    <div className="section-heading"><div><span className="dashboard-kicker"><BarChart3 size={15} /> Relationship reporting</span><h1>Report builder</h1><p>Select records first, then choose every related activity and result you want to include.</p></div></div>
    <div className="report-builder-layout">
      <section className="report-config-card">
        <div className="report-config-intro"><strong>Build your report</strong><span>Complete the four steps below.</span></div>

        <div className="report-step-section">
          <div className="report-step"><span>1</span><div><strong>Choose a module</strong><small>What should this report be about?</small></div></div>
          <label className="report-select-field"><span>Module</span><select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)}>{modules.map((module) => <option value={module.key} key={module.key}>{module.label}</option>)}</select></label>
        </div>

        <div className="report-step-section">
          <div className="report-step-heading"><div className="report-step"><span>2</span><div><strong>Choose {selectedModule?.label || 'records'}</strong><small>Select the records to include.</small></div></div><span className="report-selection-badge"><UsersRound size={13} />{selectedIds.length} selected</span></div>
          <div className="report-record-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${selectedModule?.label?.toLowerCase() || 'records'}…`} /></label><button type="button" disabled={!filteredOptions.length} onClick={() => { const visible = filteredOptions.map((item) => item.id); setSelectedIds((current) => allVisibleSelected ? current.filter((item) => !visible.includes(item)) : [...new Set([...current, ...visible])]); setPreview(null); }}>{allVisibleSelected ? 'Clear results' : 'Select results'}</button></div>
          <div className="report-record-list">{loadingOptions ? <div className="report-record-empty">Loading available records…</div> : filteredOptions.length ? filteredOptions.map((option) => <label className={selectedIds.includes(option.id) ? 'selected' : ''} key={option.id}><input type="checkbox" checked={selectedIds.includes(option.id)} onChange={() => toggleRecord(option.id)} /><span className="report-check"><Check size={13} /></span><span className="report-record-copy"><strong>{option.label}</strong><small>{option.subtitle || 'No additional details'}</small></span></label>) : <div className="report-record-empty">No matching records found.</div>}</div>
        </div>

        <div className="report-step-section">
          <div className="report-step-heading"><div className="report-step"><span>3</span><div><strong>Choose report sections</strong><small>Pick the information you need.</small></div></div><span className="report-selection-badge">{selectedReports.length} of {selectedModule?.reports?.length || 0}</span></div>
          <div className="report-type-actions"><span>You can select multiple sections</span><button type="button" onClick={() => { setSelectedReports(selectedReports.length === selectedModule?.reports?.length ? [] : selectedModule?.reports?.map((item) => item.key) || []); setPreview(null); }}>{selectedReports.length === selectedModule?.reports?.length ? 'Clear all' : 'Select all'}</button></div>
          <div className="report-type-list">{selectedModule?.reports?.map((item) => <label className={selectedReports.includes(item.key) ? 'selected' : ''} key={item.key}><input type="checkbox" checked={selectedReports.includes(item.key)} onChange={() => toggleReport(item.key)} /><span className="report-check"><Check size={13} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</div>
        </div>

        <div className="report-step-section">
          <div className="report-step"><span>4</span><div><strong>Choose a date range</strong><small>Filter the selected activity by date.</small></div></div>
          <div className="report-period-options">{[['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['custom', 'Custom']].map(([key, label]) => <button className={period === key ? 'active' : ''} aria-pressed={period === key} type="button" key={key} onClick={() => changePeriod(key)}>{label}</button>)}</div>
          {period === 'custom' && <div className="report-date-range"><label><span>From</span><input type="date" value={range.dateFrom} onChange={(event) => { setRange({ ...range, dateFrom: event.target.value }); setPreview(null); }} /></label><label><span>To</span><input type="date" value={range.dateTo} onChange={(event) => { setRange({ ...range, dateTo: event.target.value }); setPreview(null); }} /></label></div>}
        </div>

        <LoadingButton className="report-generate-button" loading={loading} loadingText="Generating preview…" type="button" onClick={generatePreview}><Eye size={17} />Generate report preview</LoadingButton>
      </section>

      <section className="report-preview-card">
        <div className="report-preview-heading"><div><span>5</span><div><strong>Preview report</strong><small>Review every selected section before downloading.</small></div></div>{preview && <button className="primary-action" type="button" onClick={download}><Download size={16} />Download PDF</button>}</div>
        {!preview ? <div className="report-empty-preview"><FileText size={42} strokeWidth={1.4} /><strong>No preview generated</strong><p>Select records, related information, and a period to build the report.</p><div><span>Module</span><span>Records</span><span>Relationships</span><span>Period</span></div></div> : <div className="report-document-preview report-multi-preview">
          <header><div><span>JB CORPORATION</span><h2>{preview.title}</h2></div><div><strong>{preview.selectedCount}</strong><span>selected</span></div></header>
          <div className="report-document-meta"><span>Period: {preview.dateFrom || preview.dateTo ? `${preview.dateFrom || 'Beginning'} to ${preview.dateTo || 'Today'}` : 'All time'}</span><span>{preview.sections.length} sections · {preview.totalRows} rows</span><span>Generated: {new Date(preview.generatedAt).toLocaleString('en-IN')}</span></div>
          {preview.sections.map((reportSection) => <article className="report-preview-section" key={reportSection.key}><div className="report-preview-section-heading"><h3>{reportSection.title}</h3><span>{reportSection.rows.length} rows</span></div><div className="report-preview-table-wrap"><table><thead><tr><th>#</th>{reportSection.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{reportSection.rows.length ? reportSection.rows.map((row, index) => <tr key={index}><td>{index + 1}</td>{reportSection.columns.map((column) => <td key={column.key}>{displayValue(row[column.key], column.type)}</td>)}</tr>) : <tr><td className="report-no-records" colSpan={reportSection.columns.length + 1}>No matching records for this section and period.</td></tr>}</tbody></table></div></article>)}
        </div>}
      </section>
    </div>
  </div>;
}
