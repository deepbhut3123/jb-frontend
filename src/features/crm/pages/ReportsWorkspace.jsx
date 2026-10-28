import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingButton from '../../../components/LoadingButton.jsx';
import { api } from '../../../services/api.js';

const dateInput = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

function presetRange(preset) {
  if (preset === 'all') return { dateFrom: '', dateTo: '' };
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'today') {
    return { dateFrom: dateInput(today), dateTo: dateInput(today) };
  }
  if (preset === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  if (preset === 'month') {
    start.setDate(1);
  }
  if (preset === 'year') {
    start.setMonth(0);
    start.setDate(1);
  }
  return { dateFrom: dateInput(start), dateTo: dateInput(today) };
}

function displayValue(value, type) {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'date') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (type === 'currency') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }
  if (type === 'percent') return `${Number(value) || 0}%`;
  if (type === 'number') {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }
  return String(value);
}

const QUICK_PRESETS = [
  {
    id: 'master',
    module: 'master',
    title: 'Complete Business Overview',
    badge: 'Master Report (Everything)',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    icon: Sparkles,
    color: '#d97706',
    description: 'All-in-one executive summary combining business KPIs, top selling products, client companies, sales team performance, and sales pipeline.',
    features: ['Executive Business KPIs', 'Top 30 Selling Products', 'Top Client Companies', 'Sales Team Performance', 'Quotation Pipeline Breakdown'],
  },
  {
    id: 'topProducts',
    module: 'topProducts',
    title: 'Top Selling Products',
    badge: 'Sales & Inventory',
    badgeColor: '#047857',
    badgeBg: '#d1fae5',
    icon: Trophy,
    color: '#059669',
    description: 'Ranks products by total sales revenue, order quantities, accepted quotations, and estimated gross profit margin contribution.',
    features: ['Revenue & Volume Leaderboard', 'Accepted Orders Only', 'Product Gross Profit Margins', 'Sales Share by Category'],
  },
  {
    id: 'companies',
    module: 'leads',
    title: 'Company & Client Sales',
    badge: 'Client Intelligence',
    badgeColor: '#1d4ed8',
    badgeBg: '#dbeafe',
    icon: Building2,
    color: '#2563eb',
    description: 'Detailed analysis of all client companies, active and accepted quotes, sales value, and customer contact persons.',
    features: ['Company Details & Pipeline', 'Quotation Value by Company', 'Customer Contact Persons', 'Follow-up History'],
  },
  {
    id: 'users',
    module: 'users',
    title: 'Sales Team & User Performance',
    badge: 'Staff & Team',
    badgeColor: '#6d28d9',
    badgeBg: '#ede9fe',
    icon: UsersRound,
    color: '#7c3aed',
    description: 'Track staff productivity, assigned leads, quotations created, win rates, and estimated gross profit generation by user.',
    features: ['Sales Value & Estimated Profit', 'Quotations Created', 'Assigned & Created Leads', 'Follow-up Activities'],
  },
  {
    id: 'quotations',
    module: 'quotations',
    title: 'Quotations & Financials',
    badge: 'Financial Ledger',
    badgeColor: '#4338ca',
    badgeBg: '#e0e7ff',
    icon: FileText,
    color: '#4f46e5',
    description: 'Financial ledger of all quotations with itemized line items, discounts, freight, status breakdown, and profit calculations.',
    features: ['Quotation Details & Amounts', 'Item Breakdown with Rates', 'Financials & Gross Margins', 'Revision History'],
  },
  {
    id: 'leads',
    module: 'leads',
    title: 'Leads Pipeline & Stages',
    badge: 'CRM Pipeline',
    badgeColor: '#c2410c',
    badgeBg: '#ffedd5',
    icon: Layers,
    color: '#ea580c',
    description: 'Full visibility into every prospect, current pipeline stage, acquisition source, priority levels, and scheduled follow-ups.',
    features: ['Lead Details & Stage Status', 'Pipeline Stage Breakdown', 'Customer Contacts', 'Follow-up History'],
  },
];

export default function ReportsWorkspace({ token }) {
  const [viewMode, setViewMode] = useState('quick'); // 'quick' | 'custom'
  const [modules, setModules] = useState([]);
  const [moduleKey, setModuleKey] = useState('master');
  const [options, setOptions] = useState([]);
  const [scopeMode, setScopeMode] = useState('all'); // 'all' | 'specific'
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [period, setPeriod] = useState('all');
  const [range, setRange] = useState(() => presetRange('all'));
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [activePresetId, setActivePresetId] = useState('master');
  const controlPanelRef = useRef(null);

  useEffect(() => {
    if (controlPanelRef.current) {
      controlPanelRef.current.scrollTop = 0;
    }
  }, [viewMode, moduleKey]);

  const selectedModule = useMemo(
    () => modules.find((item) => item.key === moduleKey),
    [moduleKey, modules]
  );

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? options.filter((item) => `${item.label} ${item.subtitle}`.toLowerCase().includes(query))
      : options;
  }, [options, search]);

  useEffect(() => {
    api.reportCatalog(token)
      .then(({ modules: list = [] }) => {
        setModules(list);
        if (list.length && !list.some((item) => item.key === moduleKey)) {
          setModuleKey(list[0].key);
        }
      })
      .catch((error) => toast.error(error.message));
  }, [token]);

  useEffect(() => {
    if (!moduleKey) return undefined;
    if (scopeMode === 'all') {
      setOptions([]);
      return undefined;
    }
    let active = true;
    setLoadingOptions(true);
    api.reportOptions(token, moduleKey)
      .then(({ options: list = [] }) => {
        if (active) setOptions(list);
      })
      .catch((error) => {
        if (active) toast.error(error.message);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, [moduleKey, scopeMode, token]);

  useEffect(() => {
    if (selectedModule?.reports?.length) {
      setSelectedReports(selectedModule.reports.map((r) => r.key));
    } else {
      setSelectedReports([]);
    }
  }, [moduleKey, selectedModule]);

  function toggleRecord(optionId) {
    setSelectedIds((current) =>
      current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]
    );
  }

  function toggleReport(reportKey) {
    setSelectedReports((current) =>
      current.includes(reportKey) ? current.filter((item) => item !== reportKey) : [...current, reportKey]
    );
  }

  function changePeriod(next) {
    setPeriod(next);
    const nextRange = next !== 'custom' ? presetRange(next) : range;
    if (next !== 'custom') setRange(nextRange);

    if (preview) {
      runReportQuery({
        module: preview.module || moduleKey,
        allRecords: scopeMode === 'all',
        selectedIds: scopeMode === 'all' ? [] : selectedIds,
        reports: selectedReports.length ? selectedReports : undefined,
        ...nextRange,
      });
    }
  }

  async function runReportQuery(payload) {
    setLoading(true);
    try {
      const data = await api.previewReport(token, payload);
      setPreview(data);
      if (payload.module) setModuleKey(payload.module);
    } catch (error) {
      toast.error(error.message || 'Could not generate report.');
    } finally {
      setLoading(false);
    }
  }

  function runQuickPreset(preset) {
    setActivePresetId(preset.id);
    setModuleKey(preset.module);
    setScopeMode('all');
    setSelectedIds([]);

    const mod = modules.find((m) => m.key === preset.module);
    const reports = mod?.reports?.map((r) => r.key) || [];
    setSelectedReports(reports);

    runReportQuery({
      module: preset.module,
      allRecords: true,
      reports: reports.length ? reports : undefined,
      ...range,
    });
  }

  async function generateCustomReport() {
    if (scopeMode === 'specific' && !selectedIds.length) {
      return toast.error(`Select at least one ${selectedModule?.singular || 'record'} or switch to "All Records".`);
    }
    if (!selectedReports.length) {
      return toast.error('Select at least one report section.');
    }
    if (period === 'custom' && (!range.dateFrom || !range.dateTo)) {
      return toast.error('Select both custom start and end dates.');
    }
    if (range.dateFrom && range.dateTo && range.dateFrom > range.dateTo) {
      return toast.error('The start date cannot be after the end date.');
    }

    runReportQuery({
      module: moduleKey,
      allRecords: scopeMode === 'all',
      selectedIds: scopeMode === 'all' ? [] : selectedIds,
      reports: selectedReports,
      ...range,
    });
  }

  async function downloadPdf() {
    if (!preview) return;
    try {
      const { downloadReportPdf } = await import('../../../utils/reportPdf.js');
      downloadReportPdf(preview);
      toast.success('Report PDF downloaded successfully.');
    } catch (error) {
      toast.error(error.message || 'Could not create PDF.');
    }
  }

  async function downloadCsv() {
    if (!preview) return;
    try {
      const { downloadReportCsv } = await import('../../../utils/reportPdf.js');
      downloadReportCsv(preview);
      toast.success('Report CSV downloaded successfully.');
    } catch (error) {
      toast.error(error.message || 'Could not create CSV file.');
    }
  }

  async function downloadSectionPdf(reportSection) {
    if (!preview) return;
    try {
      const { downloadReportSectionPdf } = await import('../../../utils/reportPdf.js');
      downloadReportSectionPdf(preview, reportSection);
      toast.success(`${reportSection.title} PDF downloaded.`);
    } catch (error) {
      toast.error(error.message || 'Could not create the table PDF.');
    }
  }

  async function downloadSectionCsv(reportSection) {
    if (!preview) return;
    try {
      const { downloadReportSectionCsv } = await import('../../../utils/reportPdf.js');
      downloadReportSectionCsv(preview, reportSection);
      toast.success(`${reportSection.title} CSV downloaded.`);
    } catch (error) {
      toast.error(error.message || 'Could not create the table CSV.');
    }
  }

  const allVisibleSelected =
    filteredOptions.length > 0 && filteredOptions.every((item) => selectedIds.includes(item.id));

  const filteredPreviewSections = useMemo(() => {
    if (!preview?.sections) return [];
    if (!tableFilter.trim()) return preview.sections;
    const q = tableFilter.trim().toLowerCase();
    return preview.sections.map((sec) => ({
      ...sec,
      rows: sec.rows.filter((row) =>
        Object.values(row).some((val) => String(val || '').toLowerCase().includes(q))
      ),
    }));
  }, [preview, tableFilter]);

  return (
    <div className="crm-content-inner reports-page">
      {/* Top Section Heading */}
      <div className="reports-header-strip">
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <div>
            <span className="dashboard-kicker">
              <BarChart3 size={15} /> Relationship & Executive Intelligence
            </span>
            <h1>Reports & Analytics Center</h1>
            <p>
              Generate one-click executive reports for your users, company clients, top-selling products, or run a complete master business report.
            </p>
          </div>
        </div>

        {/* Global Controls: Mode Toggle & Period Buttons */}
        <div className="reports-top-controls">
          <div className="reports-mode-toggle">
            <button
              type="button"
              className={viewMode === 'quick' ? 'active' : ''}
              onClick={() => setViewMode('quick')}
            >
              <Sparkles size={14} /> 1-Click Smart Reports
            </button>
            <button
              type="button"
              className={viewMode === 'custom' ? 'active' : ''}
              onClick={() => setViewMode('custom')}
            >
              <Eye size={14} /> Custom Builder
            </button>
          </div>

          <div className="reports-period-pills">
            {[
              ['all', 'All Time'],
              ['today', 'Today'],
              ['week', 'This Week'],
              ['month', 'This Month'],
              ['year', 'This Year'],
              ['custom', 'Custom'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={period === key ? 'active' : ''}
                onClick={() => changePeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker if Custom is active */}
      {period === 'custom' && (
        <div className="reports-custom-range-bar">
          <div className="reports-custom-range-inner">
            <Calendar size={16} />
            <span>Select Date Range:</span>
            <label>
              <span>From</span>
              <input
                type="date"
                value={range.dateFrom}
                onChange={(e) => setRange({ ...range, dateFrom: e.target.value })}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={range.dateTo}
                onChange={(e) => setRange({ ...range, dateTo: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="reports-apply-date-btn"
              onClick={() => {
                if (preview) {
                  runReportQuery({
                    module: preview.module || moduleKey,
                    allRecords: scopeMode === 'all',
                    selectedIds: scopeMode === 'all' ? [] : selectedIds,
                    reports: selectedReports.length ? selectedReports : undefined,
                    ...range,
                  });
                }
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="reports-workspace-layout">
        {/* Left Column / Top Section: Quick Presets OR Custom Builder */}
        <aside ref={controlPanelRef} className="reports-control-panel">
          {viewMode === 'quick' ? (
            <div className="quick-reports-wrapper">
              <div className="quick-reports-intro">
                <div>
                  <strong>1-Click Quick Reports</strong>
                  <span>Click any report card below to generate it instantly with zero configuration</span>
                </div>
              </div>

              <div className="quick-presets-grid">
                {QUICK_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = preview?.module === preset.module && activePresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`quick-preset-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => runQuickPreset(preset)}
                    >
                      <div className="quick-preset-head">
                        <div className="quick-preset-icon" style={{ background: `${preset.color}15`, color: preset.color }}>
                          <Icon size={20} />
                        </div>
                        <span
                          className="quick-preset-tag"
                          style={{ color: preset.badgeColor, background: preset.badgeBg }}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <h3 className="quick-preset-title">{preset.title}</h3>
                      <p className="quick-preset-desc">{preset.description}</p>
                      <ul className="quick-preset-features">
                        {preset.features.slice(0, 3).map((f, i) => (
                          <li key={i}>
                            <Check size={12} /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="quick-preset-action">
                        <button
                          type="button"
                          className="quick-preset-btn"
                          disabled={loading && activePresetId === preset.id}
                        >
                          {loading && activePresetId === preset.id ? (
                            <>
                              <RefreshCw size={13} className="spin" /> Generating…
                            </>
                          ) : (
                            <>
                              ⚡ Run 1-Click Report <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Custom Builder Form */
            <div className="custom-builder-wrapper">
              <div className="report-config-intro">
                <strong>Custom Report Builder</strong>
                <span>Configure modules, records, and specific fields.</span>
              </div>

              {/* Step 1: Module */}
              <div className="report-step-section">
                <div className="report-step">
                  <span>1</span>
                  <div>
                    <strong>Select Module</strong>
                    <small>What entity do you want to report on?</small>
                  </div>
                </div>
                <label className="report-select-field">
                  <select value={moduleKey} onChange={(e) => setModuleKey(e.target.value)}>
                    {modules.map((m) => (
                      <option value={m.key} key={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Step 2: Records Scope (All vs Specific) */}
              <div className="report-step-section">
                <div className="report-step-heading">
                  <div className="report-step">
                    <span>2</span>
                    <div>
                      <strong>Records Scope</strong>
                      <small>Include all records or filter specific ones?</small>
                    </div>
                  </div>
                </div>

                <div className="reports-scope-selector">
                  <button
                    type="button"
                    className={scopeMode === 'all' ? 'active' : ''}
                    onClick={() => {
                      setScopeMode('all');
                      setSelectedIds([]);
                    }}
                  >
                    <Check size={14} /> All {selectedModule?.label || 'Records'} (Recommended)
                  </button>
                  <button
                    type="button"
                    className={scopeMode === 'specific' ? 'active' : ''}
                    onClick={() => setScopeMode('specific')}
                  >
                    Filter Specific Records
                  </button>
                </div>

                {scopeMode === 'all' ? (
                  <div className="reports-scope-notice">
                    <Check size={14} />
                    <span>Every {selectedModule?.singular || 'record'} in the database will be included automatically.</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <div className="report-record-toolbar">
                      <label>
                        <Search size={16} />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={`Search ${selectedModule?.label?.toLowerCase() || 'records'}…`}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!filteredOptions.length}
                        onClick={() => {
                          const visible = filteredOptions.map((item) => item.id);
                          setSelectedIds((current) =>
                            allVisibleSelected
                              ? current.filter((item) => !visible.includes(item))
                              : [...new Set([...current, ...visible])]
                          );
                        }}
                      >
                        {allVisibleSelected ? 'Clear all' : 'Select all'}
                      </button>
                    </div>

                    <div className="report-record-list">
                      {loadingOptions ? (
                        <div className="report-record-empty">Loading records…</div>
                      ) : filteredOptions.length ? (
                        filteredOptions.map((opt) => (
                          <label
                            key={opt.id}
                            className={selectedIds.includes(opt.id) ? 'selected' : ''}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(opt.id)}
                              onChange={() => toggleRecord(opt.id)}
                            />
                            <span className="report-check">
                              <Check size={13} />
                            </span>
                            <span className="report-record-copy">
                              <strong>{opt.label}</strong>
                              <small>{opt.subtitle || 'No additional details'}</small>
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="report-record-empty">No records found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Information Sections */}
              <div className="report-step-section">
                <div className="report-step-heading">
                  <div className="report-step">
                    <span>3</span>
                    <div>
                      <strong>Report Sections</strong>
                      <small>Pick the information to include in the output.</small>
                    </div>
                  </div>
                  <span className="report-selection-badge">
                    {selectedReports.length} of {selectedModule?.reports?.length || 0}
                  </span>
                </div>

                <div className="report-type-actions">
                  <span>Sections to include</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReports(
                        selectedReports.length === selectedModule?.reports?.length
                          ? []
                          : selectedModule?.reports?.map((item) => item.key) || []
                      );
                    }}
                  >
                    {selectedReports.length === selectedModule?.reports?.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>

                <div className="report-type-list">
                  {selectedModule?.reports?.map((item) => (
                    <label
                      key={item.key}
                      className={selectedReports.includes(item.key) ? 'selected' : ''}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(item.key)}
                        onChange={() => toggleReport(item.key)}
                      />
                      <span className="report-check">
                        <Check size={13} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <LoadingButton
                className="report-generate-button"
                loading={loading}
                loadingText="Generating Report…"
                type="button"
                onClick={generateCustomReport}
              >
                <Eye size={17} /> Generate Custom Report
              </LoadingButton>
            </div>
          )}
        </aside>

        {/* Right Column: Preview Display */}
        <section className="report-preview-card">
          <div className="report-preview-heading">
            <div className="report-preview-title-block">
              <span className="report-preview-step-badge">
                <FileText size={16} />
              </span>
              <div>
                <strong>{preview ? preview.title : 'Live Report Preview'}</strong>
                <small>
                  {preview
                    ? `Scope: ${preview.selectedCount} · ${preview.sections.length} sections · ${preview.totalRows} total records`
                    : 'Select a 1-click preset or customize parameters to preview and export.'}
                </small>
              </div>
            </div>

            {preview && (
              <div className="report-preview-actions">
                <button type="button" className="action-btn csv-btn" onClick={downloadCsv}>
                  <FileSpreadsheet size={15} /> Export CSV / Excel
                </button>
                <button type="button" className="action-btn pdf-btn" onClick={downloadPdf}>
                  <Download size={15} /> Download PDF
                </button>
              </div>
            )}
          </div>

          {!preview ? (
            <div className="report-empty-preview">
              <FileText size={48} strokeWidth={1.3} style={{ color: '#8c87a5' }} />
              <strong>No Report Generated Yet</strong>
              <p>Click any 1-Click report card on the left or use the Custom Builder to view and export.</p>
              <div className="quick-start-pills">
                <button
                  type="button"
                  onClick={() => runQuickPreset(QUICK_PRESETS[0])}
                  className="quick-pill-btn"
                >
                  ⚡ Run Master Business Report
                </button>
                <button
                  type="button"
                  onClick={() => runQuickPreset(QUICK_PRESETS[1])}
                  className="quick-pill-btn"
                >
                  🏆 Run Top Selling Products Report
                </button>
              </div>
            </div>
          ) : (
            <div className="report-document-preview report-multi-preview">
              {/* Document Banner */}
              <header className="report-banner-header">
                <div>
                  <span className="brand-tag">JB CORPORATION</span>
                  <h2>{preview.title}</h2>
                  <div className="report-meta-chips">
                    <span>
                      📅 Period: {preview.dateFrom || preview.dateTo ? `${preview.dateFrom || 'Beginning'} to ${preview.dateTo || 'Today'}` : 'All Time'}
                    </span>
                    <span>📊 Scope: {preview.selectedCount}</span>
                    <span>📑 Generated: {new Date(preview.generatedAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="banner-stats">
                  <strong>{preview.totalRows}</strong>
                  <span>Total Rows</span>
                </div>
              </header>

              {/* In-table search filter */}
              <div className="report-table-search-bar">
                <Search size={15} />
                <input
                  type="text"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Filter rows in the report tables below (type company, product, name, etc.)…"
                />
                {tableFilter && (
                  <button
                    type="button"
                    onClick={() => setTableFilter('')}
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#888' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Sections Display */}
              {filteredPreviewSections.map((reportSection) => (
                <article className="report-preview-section" key={reportSection.key}>
                  <div className="report-preview-section-heading">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="section-dot" />
                      <h3>{reportSection.title}</h3>
                    </div>
                    <div className="report-section-actions">
                      <span>{reportSection.rows.length} rows</span>
                      <button
                        type="button"
                        className="report-section-download csv"
                        onClick={() => downloadSectionCsv(reportSection)}
                        title={`Download ${reportSection.title} as CSV`}
                      >
                        <FileSpreadsheet size={14} /> CSV
                      </button>
                      <button
                        type="button"
                        className="report-section-download pdf"
                        onClick={() => downloadSectionPdf(reportSection)}
                        title={`Download ${reportSection.title} as PDF`}
                      >
                        <Download size={14} /> PDF
                      </button>
                    </div>
                  </div>

                  <div className="report-preview-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 44, textAlign: 'center' }}>#</th>
                          {reportSection.columns.map((column) => (
                            <th
                              key={column.key}
                              style={{
                                textAlign:
                                  column.type === 'currency' || column.type === 'number'
                                    ? 'right'
                                    : 'left',
                              }}
                            >
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportSection.rows.length ? (
                          reportSection.rows.map((row, index) => (
                            <tr key={index}>
                              <td style={{ width: 44, textAlign: 'center', fontWeight: 650, color: '#737086' }}>{index + 1}</td>
                              {reportSection.columns.map((column) => {
                                const val = row[column.key];
                                const isStatus = column.key === 'status' || column.key === 'outcome';
                                const statusClass = isStatus
                                  ? val === 'Accepted' || val === 'created'
                                    ? 'badge-accepted'
                                    : val === 'Rejected' || val === 'failed'
                                    ? 'badge-rejected'
                                    : val === 'Sent' || val === 'existing'
                                    ? 'badge-sent'
                                    : 'badge-draft'
                                  : '';
                                return (
                                  <td
                                    key={column.key}
                                    style={{
                                      textAlign:
                                        column.type === 'currency' || column.type === 'number'
                                          ? 'right'
                                          : 'left',
                                    }}
                                  >
                                    {isStatus ? (
                                      <span className={`table-status-pill ${statusClass}`}>
                                        {val}
                                      </span>
                                    ) : (
                                      displayValue(val, column.type)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              className="report-no-records"
                              colSpan={reportSection.columns.length + 1}
                            >
                              {tableFilter
                                ? 'No matching rows for your filter.'
                                : 'No matching records for this section and period.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
