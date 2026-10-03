import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { BadgeCheck, Building2, ChartNoAxesCombined, Clock3, FileText, Flame, Goal, IndianRupee, Package, UsersRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';
import { formatDisplayDate } from '../CrmUtils.jsx';
import { navigate } from '../../../utils/navigation.js';

const statuses = ['New', 'Quotation', 'Followup', 'Performa-Invoice', 'Done', 'Lost'];
const chartColors = ['#392c98', '#d36517', '#168276', '#3566ad', '#9145a8', '#c44832', '#8d8b9f'];
const preferenceKey = 'jb_dashboard_chart_preferences';
const defaultPreferences = { breakdownDimension: 'status', breakdownStyle: 'bar', trendMetric: 'created', trendStyle: 'line', comparisonDimension: 'source', comparisonStyle: 'bar', quotationStatusStyle: 'donut', quotationMetric: 'value', quotationStyle: 'columns', userQuotationMetric: 'sentCount', userQuotationStyle: 'ranked', productMetric: 'quotedQuantity', productStyle: 'bar', catalogDimension: 'category', catalogStyle: 'donut' };
const dimensionOptions = [
  { value: 'status', label: 'Pipeline stage' }, { value: 'source', label: 'Lead source' },
  { value: 'priority', label: 'Priority' }, { value: 'assignedName', label: 'Assigned team member' }, { value: 'city', label: 'City' },
];
const comparisonOptions = [
  { value: 'source', label: 'Lead source' }, { value: 'assignedName', label: 'Team member' },
  { value: 'city', label: 'City' }, { value: 'customerType', label: 'Customer type' }, { value: 'segment', label: 'Segment' },
];
const quotationStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected'];

function loadPreferences() {
  try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(preferenceKey) || '{}') }; }
  catch { return defaultPreferences; }
}

function groupLeads(leads, dimension, limit = 7) {
  if (dimension === 'status') return statuses.map((label) => ({ label, value: leads.filter((lead) => lead.status === label).length }));
  const counts = new Map();
  leads.forEach((lead) => {
    const label = String(lead[dimension] || 'Not specified').trim() || 'Not specified';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  const sorted = [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  return [...sorted.slice(0, limit - 1), { label: 'Other', value: sorted.slice(limit - 1).reduce((sum, item) => sum + item.value, 0) }];
}

function makeTrend(leads, range, metric) {
  const now = new Date();
  const buckets = [];
  const addBucket = (start, end, label) => buckets.push({ start, end, label, value: 0 });
  if (range === '7') {
    for (let index = 6; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
      addBucket(start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1), start.toLocaleDateString('en-IN', { weekday: 'short' }));
    }
  } else if (range === '30') {
    for (let index = 4; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (index * 6 + 5));
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (index * 6) + 1);
      addBucket(start, end, `${start.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })}`);
    }
  } else if (range === '90') {
    for (let index = 12; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (index * 7 + 6));
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (index * 7) + 1);
      addBucket(start, end, index % 2 === 0 ? `${start.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })}` : '');
    }
  } else {
    for (let index = 11; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
      addBucket(start, new Date(start.getFullYear(), start.getMonth() + 1, 1), start.toLocaleDateString('en-IN', { month: 'short' }));
    }
  }
  leads.forEach((lead) => {
    if (metric === 'won' && lead.status !== 'Done') return;
    if (metric === 'followups' && !lead.nextFollowUp) return;
    const date = new Date(metric === 'followups' ? lead.nextFollowUp : metric === 'won' ? lead.updatedAt : lead.createdAt);
    const bucket = buckets.find((item) => date >= item.start && date < item.end);
    if (bucket) bucket.value += 1;
  });
  return buckets;
}

function makeQuotationTrend(quotations, range, metric) {
  const buckets = makeTrend([], range, 'created');
  quotations.forEach((quotation) => {
    if (metric === 'acceptedValue' && quotation.status !== 'Accepted') return;
    if (metric === 'sentCount' && !['Sent', 'Accepted'].includes(quotation.status)) return;
    const date = new Date(quotation.quotationDate || quotation.createdAt);
    const bucket = buckets.find((item) => date >= item.start && date < item.end);
    if (!bucket) return;
    bucket.value += ['value', 'acceptedValue'].includes(metric) ? Number(quotation.amount || 0) : 1;
  });
  return buckets;
}

function productDemand(quotations, metric, limit = 7) {
  const demand = new Map();
  quotations.forEach((quotation) => {
    if (metric.startsWith('accepted') && quotation.status !== 'Accepted') return;
    if (metric.startsWith('sent') && !['Sent', 'Accepted'].includes(quotation.status)) return;
    const productsInQuotation = new Set();
    (quotation.items || []).forEach((item) => {
      const key = String(item.productId || item.productCode || item.productName);
      const current = demand.get(key) || { label: item.productName || item.productCode || 'Unnamed product', value: 0 };
      if (['quotationCount', 'sentQuotationCount'].includes(metric)) {
        if (!productsInQuotation.has(key)) current.value += 1;
      } else if (['quotedValue', 'acceptedValue'].includes(metric)) current.value += Number(item.lineTotal || 0);
      else current.value += Number(item.quantity || 0);
      productsInQuotation.add(key);
      demand.set(key, current);
    });
  });
  return [...demand.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

function latestQuotationVersions(quotations) {
  const latest = new Map();
  quotations.forEach((quotation) => {
    const key = String(quotation.revisionRoot || quotation.revisedFrom || quotation._id);
    const current = latest.get(key);
    if (!current || Number(quotation.revisionNumber || 0) > Number(current.revisionNumber || 0) || new Date(quotation.updatedAt) > new Date(current.updatedAt)) latest.set(key, quotation);
  });
  return [...latest.values()];
}

function userQuotationPerformance(quotations, metric) {
  const performance = new Map();
  quotations.forEach((quotation) => {
    const label = String(quotation.createdByName || 'Unknown user').trim() || 'Unknown user';
    const current = performance.get(label) || 0;
    if (metric === 'sentCount') performance.set(label, current + (['Sent', 'Accepted'].includes(quotation.status) ? 1 : 0));
    else if (metric === 'quotedValue') performance.set(label, current + Number(quotation.amount || 0));
    else if (metric === 'acceptedValue') performance.set(label, current + (quotation.status === 'Accepted' ? Number(quotation.amount || 0) : 0));
    else if (metric === 'acceptedCount') performance.set(label, current + (quotation.status === 'Accepted' ? 1 : 0));
    else performance.set(label, current + 1);
  });
  return [...performance].filter(([, value]) => value > 0).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
}

function productCatalogBreakdown(products, dimension) {
  const counts = new Map();
  products.forEach((product) => {
    const raw = dimension === 'status' ? (product.isActive ? 'Active' : 'Inactive') : dimension === 'taxRate' ? `${product.taxRate || 0}% GST` : product[dimension];
    const label = String(raw || 'Not specified').trim() || 'Not specified';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 7);
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: Number(value) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value || 0));
}

function ChartControls({ dimension, dimensions, style, styles, onDimension, onStyle }) {
  return <div className="dashboard-chart-controls">
    <Select aria-label="Chart data" className="dashboard-chart-select" value={dimension} options={dimensions} onChange={onDimension} />
    <Select aria-label="Chart design" className="dashboard-chart-select style-select" value={style} options={styles} onChange={onStyle} />
  </div>;
}

function BarChart({ data, ranked = false, valueFormatter = (value) => value.toLocaleString('en-IN') }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return data.length ? <div className={`dashboard-bars${ranked ? ' ranked' : ''}`}>
    {data.map((item, index) => <div className="dashboard-bar-row" key={item.label}>
      {ranked && <span className="dashboard-rank">{index + 1}</span>}
      <div className="dashboard-bar-copy"><span title={item.label}>{item.label}</span><strong>{valueFormatter(item.value)}</strong></div>
      <div className="dashboard-bar-track"><i style={{ width: `${(item.value / max) * 100}%`, background: chartColors[index % chartColors.length] }} /></div>
    </div>)}
  </div> : <p className="analytics-empty">No data available for this selection.</p>;
}

function DonutChart({ data, valueFormatter = (value) => value.toLocaleString('en-IN') }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let running = 0;
  const stops = data.map((item, index) => {
    const start = total ? (running / total) * 100 : 0;
    running += item.value;
    const end = total ? (running / total) * 100 : 0;
    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });
  return <div className="dashboard-donut-layout">
    <div className="dashboard-donut" style={{ background: total ? `conic-gradient(${stops.join(',')})` : '#ececf3' }}><div><strong>{valueFormatter(total)}</strong><span>Total</span></div></div>
    <div className="dashboard-legend">{data.map((item, index) => <div key={item.label}><i style={{ background: chartColors[index % chartColors.length] }} /><span title={item.label}>{item.label}</span><strong>{valueFormatter(item.value)}</strong></div>)}</div>
  </div>;
}

function TrendChart({ data, style, valueFormatter = (value) => value.toLocaleString('en-IN') }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (style === 'columns') return <div className="dashboard-column-chart"><div className="dashboard-columns">{data.map((item, index) => <div key={`${item.label}-${index}`}><strong>{valueFormatter(item.value)}</strong><i style={{ height: `${Math.max((item.value / max) * 100, item.value ? 8 : 2)}%` }} /></div>)}</div><div className="dashboard-axis-labels">{data.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></div>;
  const points = data.map((item, index) => ({ x: 20 + (index * 560) / Math.max(data.length - 1, 1), y: 185 - (item.value / max) * 145, ...item }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `20,190 ${line} ${points.at(-1)?.x || 580},190`;
  return <div className="dashboard-line-chart"><svg viewBox="0 0 600 210" role="img" aria-label="Performance trend chart"><line x1="20" y1="190" x2="580" y2="190" className="chart-grid-line" /><line x1="20" y1="117" x2="580" y2="117" className="chart-grid-line" /><line x1="20" y1="44" x2="580" y2="44" className="chart-grid-line" />{style === 'area' && <polygon points={area} className="chart-area" />}<polyline points={line} className="chart-line" />{points.map((point, index) => <g key={`${point.label}-${index}`}><circle cx={point.x} cy={point.y} r="5" className="chart-point" /><title>{point.label || 'Period'}: {valueFormatter(point.value)}</title></g>)}</svg><div className="dashboard-axis-labels">{data.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div></div>;
}

function DashboardOverview({ session }) {
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [range, setRange] = useState('all');
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    let active = true;
    async function loadDashboardData() {
      try {
        const [firstLeadPage, quotationResponse, firstProductPage] = await Promise.all([
          api.leads(session.token, { page: 1, limit: 100 }), api.quotations(session.token), api.products(session.token, { page: 1, limit: 1000 }),
        ]);
        const leadPages = firstLeadPage.pagination?.totalPages || 1;
        const productPages = firstProductPage.pagination?.totalPages || 1;
        const [remainingLeadPages, remainingProductPages] = await Promise.all([
          leadPages > 1 ? Promise.all(Array.from({ length: leadPages - 1 }, (_, index) => api.leads(session.token, { page: index + 2, limit: 100 }))) : [],
          productPages > 1 ? Promise.all(Array.from({ length: productPages - 1 }, (_, index) => api.products(session.token, { page: index + 2, limit: 1000 }))) : [],
        ]);
        if (active) {
          setLeads([...(firstLeadPage.leads || []), ...remainingLeadPages.flatMap((page) => page.leads || [])]);
          setQuotations(quotationResponse.quotations || []);
          setProducts([...(firstProductPage.products || []), ...remainingProductPages.flatMap((page) => page.products || [])]);
        }
      } catch (error) { if (active) toast.error(error.message); }
    }
    loadDashboardData();
    return () => { active = false; };
  }, [session.token]);

  useEffect(() => { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); }, [preferences]);
  const updatePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));
  const filteredLeads = useMemo(() => {
    if (range === 'all') return leads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return leads.filter((lead) => new Date(lead.createdAt) >= cutoff);
  }, [leads, range]);
  const periodQuotations = useMemo(() => {
    if (range === 'all') return quotations;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return quotations.filter((quotation) => new Date(quotation.quotationDate || quotation.createdAt) >= cutoff);
  }, [quotations, range]);
  const filteredQuotations = useMemo(() => latestQuotationVersions(periodQuotations), [periodQuotations]);

  const metrics = useMemo(() => {
    const open = filteredLeads.filter((lead) => !['Done', 'Lost'].includes(lead.status));
    const won = filteredLeads.filter((lead) => lead.status === 'Done').length;
    const lost = filteredLeads.filter((lead) => lead.status === 'Lost').length;
    const now = new Date();
    const overdue = open.filter((lead) => lead.nextFollowUp && new Date(lead.nextFollowUp) < now).length;
    const scheduled = open.filter((lead) => lead.nextFollowUp).length;
    const highPriority = open.filter((lead) => lead.priority === 'High').length;
    const customers = new Set(filteredLeads.map((lead) => String(lead.company || '').trim().toLowerCase()).filter(Boolean)).size;
    return { open: open.length, won, lost, overdue, scheduled, highPriority, customers, winRate: filteredLeads.length ? Math.round((won / filteredLeads.length) * 100) : 0 };
  }, [filteredLeads]);

  const breakdown = useMemo(() => groupLeads(filteredLeads, preferences.breakdownDimension), [filteredLeads, preferences.breakdownDimension]);
  const comparison = useMemo(() => groupLeads(filteredLeads, preferences.comparisonDimension), [filteredLeads, preferences.comparisonDimension]);
  const trend = useMemo(() => makeTrend(filteredLeads, range, preferences.trendMetric), [filteredLeads, preferences.trendMetric, range]);
  const quotationMetrics = useMemo(() => {
    const totalValue = filteredQuotations.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0);
    const accepted = filteredQuotations.filter((quotation) => quotation.status === 'Accepted');
    const acceptedValue = accepted.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0);
    const decided = filteredQuotations.filter((quotation) => ['Accepted', 'Rejected'].includes(quotation.status)).length;
    return { totalValue, acceptedValue, accepted: accepted.length, acceptanceRate: decided ? Math.round((accepted.length / decided) * 100) : 0, revisions: periodQuotations.filter((quotation) => Number(quotation.revisionNumber) > 0).length };
  }, [filteredQuotations, periodQuotations]);
  const quotationStatusData = useMemo(() => quotationStatuses.map((label) => ({ label, value: filteredQuotations.filter((quotation) => quotation.status === label).length })), [filteredQuotations]);
  const quotationTrend = useMemo(() => makeQuotationTrend(filteredQuotations, range, preferences.quotationMetric), [filteredQuotations, preferences.quotationMetric, range]);
  const userQuotationData = useMemo(() => userQuotationPerformance(filteredQuotations, preferences.userQuotationMetric), [filteredQuotations, preferences.userQuotationMetric]);
  const demand = useMemo(() => productDemand(filteredQuotations, preferences.productMetric), [filteredQuotations, preferences.productMetric]);
  const catalog = useMemo(() => productCatalogBreakdown(products, preferences.catalogDimension), [products, preferences.catalogDimension]);
  const activeProducts = products.filter((product) => product.isActive).length;
  const topSource = groupLeads(filteredLeads, 'source')[0];
  const latest = [...filteredLeads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const quotationValueFormatter = ['value', 'acceptedValue'].includes(preferences.quotationMetric) ? formatCompactCurrency : undefined;
  const userQuotationValueFormatter = ['quotedValue', 'acceptedValue'].includes(preferences.userQuotationMetric) ? formatCompactCurrency : undefined;
  const demandValueFormatter = ['quotedValue', 'acceptedValue'].includes(preferences.productMetric) ? formatCompactCurrency : undefined;

  return <div className="crm-content-inner analytics-dashboard">
    <div className="analytics-heading dashboard-heading">
      <div><span className="dashboard-kicker">Live business performance</span><h1>Good to see you, {session.user.name.split(' ')[0]}.</h1><p>Track leads, quotations, product demand and team activity from one place.</p></div>
      <label className="dashboard-period"><span>Reporting period</span><Select className="antd-range-select" value={range} onChange={setRange} options={[{ value: 'all', label: 'All time' }, { value: '365', label: 'Last 12 months' }, { value: '90', label: 'Last 90 days' }, { value: '30', label: 'Last 30 days' }, { value: '7', label: 'Last 7 days' }]} /></label>
    </div>

    <div className="analytics-kpis dashboard-kpis">
      <article><span className="dashboard-kpi-icon purple"><UsersRound size={18} /></span><div><span>Total leads</span><strong>{filteredLeads.length}</strong><small>In selected period</small></div></article>
      <article><span className="dashboard-kpi-icon blue"><Building2 size={18} /></span><div><span>Customer companies</span><strong>{metrics.customers}</strong><small>{metrics.open} leads in open pipeline</small></div></article>
      <article><span className="dashboard-kpi-icon orange"><FileText size={18} /></span><div><span>Quotations</span><strong>{filteredQuotations.length}</strong><small>{quotationMetrics.revisions} total revisions</small></div></article>
      <article><span className="dashboard-kpi-icon amber"><IndianRupee size={18} /></span><div><span>Quoted value</span><strong>{formatCompactCurrency(quotationMetrics.totalValue)}</strong><small>Latest quotation versions</small></div></article>
      <article><span className="dashboard-kpi-icon green"><BadgeCheck size={18} /></span><div><span>Accepted value</span><strong>{formatCompactCurrency(quotationMetrics.acceptedValue)}</strong><small>{quotationMetrics.acceptanceRate}% decision success rate</small></div></article>
      <article><span className="dashboard-kpi-icon red"><Package size={18} /></span><div><span>Active products</span><strong>{activeProducts}</strong><small>{products.length - activeProducts} inactive · {products.length} total</small></div></article>
    </div>

    <div className="dashboard-module-heading"><div><span className="dashboard-module-icon leads"><UsersRound size={18} /></span><div><span>Lead module</span><h2>Pipeline and acquisition intelligence</h2></div></div><small>{metrics.scheduled} follow-ups scheduled · {metrics.overdue} overdue</small></div>
    <div className="dashboard-chart-grid">
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Distribution</span><h2>Lead breakdown</h2></div><ChartControls dimension={preferences.breakdownDimension} dimensions={dimensionOptions} style={preferences.breakdownStyle} styles={[{ value: 'bar', label: 'Bar chart' }, { value: 'donut', label: 'Donut chart' }]} onDimension={(value) => updatePreference('breakdownDimension', value)} onStyle={(value) => updatePreference('breakdownStyle', value)} /></div>
        {preferences.breakdownStyle === 'donut' ? <DonutChart data={breakdown} /> : <BarChart data={breakdown} />}
      </section>
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Momentum</span><h2>Performance trend</h2></div><ChartControls dimension={preferences.trendMetric} dimensions={[{ value: 'created', label: 'New leads' }, { value: 'won', label: 'Completed leads' }, { value: 'followups', label: 'Scheduled follow-ups' }]} style={preferences.trendStyle} styles={[{ value: 'line', label: 'Line chart' }, { value: 'area', label: 'Area chart' }, { value: 'columns', label: 'Column chart' }]} onDimension={(value) => updatePreference('trendMetric', value)} onStyle={(value) => updatePreference('trendStyle', value)} /></div>
        <TrendChart data={trend} style={preferences.trendStyle} />
      </section>
    </div>

    <div className="dashboard-secondary-grid">
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Comparison</span><h2>Top performers</h2></div><ChartControls dimension={preferences.comparisonDimension} dimensions={comparisonOptions} style={preferences.comparisonStyle} styles={[{ value: 'bar', label: 'Bar chart' }, { value: 'ranked', label: 'Ranked list' }, { value: 'donut', label: 'Donut chart' }]} onDimension={(value) => updatePreference('comparisonDimension', value)} onStyle={(value) => updatePreference('comparisonStyle', value)} /></div>
        {preferences.comparisonStyle === 'donut' ? <DonutChart data={comparison} /> : <BarChart data={comparison} ranked={preferences.comparisonStyle === 'ranked'} />}
      </section>
      <section className="analytics-card pipeline-health-card">
        <div className="analytics-card-heading"><div><span className="dashboard-kicker">Action centre</span><h2>Pipeline health</h2></div><ChartNoAxesCombined size={21} /></div>
        <div className="pipeline-health-summary"><div><strong>{metrics.open}</strong><span>Open</span></div><div><strong>{metrics.won}</strong><span>Won</span></div><div><strong>{metrics.lost}</strong><span>Lost</span></div></div>
        <div className="pipeline-health-track"><i className="open" style={{ width: `${filteredLeads.length ? (metrics.open / filteredLeads.length) * 100 : 0}%` }} /><i className="won" style={{ width: `${filteredLeads.length ? (metrics.won / filteredLeads.length) * 100 : 0}%` }} /><i className="lost" style={{ width: `${filteredLeads.length ? (metrics.lost / filteredLeads.length) * 100 : 0}%` }} /></div>
        <div className="dashboard-insights"><div><Clock3 size={16} /><span><strong>{metrics.overdue} overdue follow-ups</strong><small>Need attention now</small></span></div><div><Flame size={16} /><span><strong>{metrics.highPriority} hot opportunities</strong><small>High-priority open leads</small></span></div><div><Goal size={16} /><span><strong>{topSource?.label || 'No source data'}</strong><small>{topSource ? `${topSource.value} leads from your top source` : 'Add lead sources for insights'}</small></span></div></div>
      </section>
    </div>

    <div className="dashboard-module-heading"><div><span className="dashboard-module-icon quotations"><FileText size={18} /></span><div><span>Quotation module</span><h2>Quotation performance and value</h2></div></div><small>{quotationMetrics.accepted} accepted · {quotationMetrics.acceptanceRate}% success after decision</small></div>
    <div className="dashboard-chart-grid">
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Outcome</span><h2>Quotation status</h2></div><div className="dashboard-chart-controls"><Select aria-label="Quotation status chart design" className="dashboard-chart-select style-select" value={preferences.quotationStatusStyle || 'donut'} options={[{ value: 'donut', label: 'Donut chart' }, { value: 'bar', label: 'Bar chart' }]} onChange={(value) => updatePreference('quotationStatusStyle', value)} /></div></div>
        {(preferences.quotationStatusStyle || 'donut') === 'donut' ? <DonutChart data={quotationStatusData} /> : <BarChart data={quotationStatusData} />}
      </section>
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Commercial trend</span><h2>Quotation movement</h2></div><ChartControls dimension={preferences.quotationMetric} dimensions={[{ value: 'value', label: 'Quoted value' }, { value: 'acceptedValue', label: 'Accepted value' }, { value: 'count', label: 'Quotation count' }, { value: 'sentCount', label: 'Sent quotation count' }]} style={preferences.quotationStyle} styles={[{ value: 'line', label: 'Line chart' }, { value: 'area', label: 'Area chart' }, { value: 'columns', label: 'Column chart' }]} onDimension={(value) => updatePreference('quotationMetric', value)} onStyle={(value) => updatePreference('quotationStyle', value)} /></div>
        <TrendChart data={quotationTrend} style={preferences.quotationStyle} valueFormatter={quotationValueFormatter} />
      </section>
    </div>
    <section className="analytics-card dashboard-chart-card dashboard-user-quotation-card">
      <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Team contribution</span><h2>Quotation performance by user</h2></div><ChartControls dimension={preferences.userQuotationMetric} dimensions={[{ value: 'sentCount', label: 'Sent quotations' }, { value: 'createdCount', label: 'Created quotations' }, { value: 'acceptedCount', label: 'Accepted quotations' }, { value: 'quotedValue', label: 'Quoted value' }, { value: 'acceptedValue', label: 'Accepted value' }]} style={preferences.userQuotationStyle} styles={[{ value: 'ranked', label: 'Ranked list' }, { value: 'bar', label: 'Bar chart' }, { value: 'donut', label: 'Donut chart' }]} onDimension={(value) => updatePreference('userQuotationMetric', value)} onStyle={(value) => updatePreference('userQuotationStyle', value)} /></div>
      {preferences.userQuotationStyle === 'donut' ? <DonutChart data={userQuotationData} valueFormatter={userQuotationValueFormatter} /> : <BarChart data={userQuotationData} ranked={preferences.userQuotationStyle === 'ranked'} valueFormatter={userQuotationValueFormatter} />}
      <p className="dashboard-chart-note">Performance is assigned to the quotation creator. Accepted value is a sales indicator, not invoiced revenue.</p>
    </section>

    <div className="dashboard-module-heading"><div><span className="dashboard-module-icon products"><Package size={18} /></span><div><span>Product module</span><h2>Product demand and catalogue intelligence</h2></div></div><small>Accepted quantity is based on accepted quotations, not invoiced sales.</small></div>
    <div className="dashboard-chart-grid">
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Demand ranking</span><h2>Most requested products</h2></div><ChartControls dimension={preferences.productMetric} dimensions={[{ value: 'quotedQuantity', label: 'Quoted quantity' }, { value: 'quotationCount', label: 'Quotation frequency' }, { value: 'sentQuotationCount', label: 'Sent quote frequency' }, { value: 'quotedValue', label: 'Quoted value' }, { value: 'acceptedQuantity', label: 'Accepted quantity' }, { value: 'acceptedValue', label: 'Accepted value' }]} style={preferences.productStyle} styles={[{ value: 'bar', label: 'Bar chart' }, { value: 'ranked', label: 'Ranked list' }, { value: 'donut', label: 'Donut chart' }]} onDimension={(value) => updatePreference('productMetric', value)} onStyle={(value) => updatePreference('productStyle', value)} /></div>
        {preferences.productStyle === 'donut' ? <DonutChart data={demand} valueFormatter={demandValueFormatter} /> : <BarChart data={demand} ranked={preferences.productStyle === 'ranked'} valueFormatter={demandValueFormatter} />}
      </section>
      <section className="analytics-card dashboard-chart-card">
        <div className="analytics-card-heading dashboard-card-heading"><div><span className="dashboard-kicker">Product master</span><h2>Catalogue mix</h2></div><ChartControls dimension={preferences.catalogDimension} dimensions={[{ value: 'category', label: 'Category' }, { value: 'subCategory', label: 'Sub-category' }, { value: 'brand', label: 'Brand' }, { value: 'status', label: 'Active status' }, { value: 'taxRate', label: 'GST rate' }]} style={preferences.catalogStyle} styles={[{ value: 'donut', label: 'Donut chart' }, { value: 'bar', label: 'Bar chart' }]} onDimension={(value) => updatePreference('catalogDimension', value)} onStyle={(value) => updatePreference('catalogStyle', value)} /></div>
        {preferences.catalogStyle === 'donut' ? <DonutChart data={catalog} /> : <BarChart data={catalog} />}
      </section>
    </div>

    <section className="analytics-card activity-card dashboard-activity-card">
      <div className="analytics-card-heading"><div><span className="dashboard-kicker">Recent activity</span><h2>Latest leads</h2></div><button className="text-action" type="button" onClick={() => navigate('/leads')}>View all leads</button></div>
      {latest.length ? <div className="activity-list">{latest.map((lead) => <div className="activity-row" key={lead._id}><div className={`activity-status status-${String(lead.status || 'new').toLowerCase().replace(/[^a-z]/g, '')}`} /><div><strong>{lead.company || 'Unnamed company'}</strong><span>{lead.city || 'No city'} · {lead.status} · {lead.assignedName || 'Unassigned'}</span></div><span className={`activity-priority priority-${String(lead.priority || 'medium').toLowerCase()}`}>{lead.priority || 'Medium'}</span><time>{formatDisplayDate(lead.createdAt)}</time></div>)}</div> : <p className="analytics-empty">Create your first lead to see activity here.</p>}
    </section>
  </div>;
}

export default DashboardOverview;
