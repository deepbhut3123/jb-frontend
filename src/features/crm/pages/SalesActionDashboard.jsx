import { createElement, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, CircleX, ClipboardList, Clock3, FileText, Goal, Package, Search, TrendingUp, UsersRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';
import { can } from '../../../utils/permissions.js';
import { navigate } from '../../../utils/navigation.js';
import './SalesActionDashboard.css';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0));
const percent = (part, total) => total ? Math.round(part / total * 100) : 0;
const label = (value, fallback = 'Not specified') => String(value || '').trim() || fallback;
const dateOf = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };

async function loadPages(fetchPage, key, limit = 100) {
  const first = await fetchPage({ page: 1, limit });
  const pages = Number(first?.pagination?.totalPages || 1);
  const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => fetchPage({ page: index + 2, limit }))) : [];
  return [first, ...rest].flatMap((page) => page?.[key] || []);
}

function latestVersions(quotations) {
  const latest = new Map();
  quotations.forEach((quotation) => {
    const key = String(quotation.revisionRoot || quotation.revisedFrom || quotation._id);
    const current = latest.get(key);
    if (!current || Number(quotation.revisionNumber || 0) > Number(current.revisionNumber || 0) || (Number(quotation.revisionNumber || 0) === Number(current.revisionNumber || 0) && new Date(quotation.updatedAt) > new Date(current.updatedAt))) latest.set(key, quotation);
  });
  return [...latest.values()];
}

function inPeriod(value, period) {
  if (period === 'all') return true;
  const date = dateOf(value);
  if (!date) return false;
  const today = new Date();
  if (period === 'month') return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(period));
  return date >= cutoff;
}

function groupBy(records, getKey, max = 5) {
  const counts = new Map();
  records.forEach((record) => { const key = label(getKey(record)); counts.set(key, (counts.get(key) || 0) + 1); });
  const sorted = [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return sorted.length > max ? [...sorted.slice(0, max - 1), { name: 'Other', value: sorted.slice(max - 1).reduce((sum, item) => sum + item.value, 0) }] : sorted;
}

function Card({ icon, title, eyebrow, children, action, className = '' }) {
  return <section className={`sad-card ${className}`}>
    <div className="sad-card-head"><span className="sad-card-icon">{createElement(icon, { size: 20, strokeWidth: 2.1 })}</span><div><h2>{title}</h2>{eyebrow && <p>{eyebrow}</p>}</div>{action && <button className="sad-card-action" type="button" onClick={action.onClick}>{action.label} <ArrowRight size={14} /></button>}</div>
    {children}
  </section>;
}

function Stat({ icon, title, value, sub, tone = 'blue', onClick }) {
  return <button className={`sad-stat sad-${tone}`} type="button" onClick={onClick}>
    <span className="sad-stat-icon">{createElement(icon, { size: 24, strokeWidth: 2 })}</span><span className="sad-stat-copy"><span className="sad-stat-title">{title}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</span>
  </button>;
}

function BarList({ data, color = 'purple', empty = 'No data in this period.', format = number }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return data.length ? <div className={`sad-bars sad-bars-${color}`}>
    {data.map((item) => <div className="sad-bar-row" key={item.name}><span title={item.name}>{item.name}</span><div className="sad-bar-track"><i style={{ width: `${Math.max(item.value ? 4 : 0, item.value / max * 100)}%` }} /></div><strong>{format(item.value)}</strong></div>)}
  </div> : <p className="sad-empty">{empty}</p>;
}

function Donut({ data, totalLabel = 'Total', valueFormatter = money }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let at = 0;
  const colors = ['#5ba7f6', '#9567e5', '#26b5ad', '#f8ab57', '#f477a1'];
  const gradient = data.map((item, index) => { const start = at; at += total ? item.value / total * 100 : 0; return `${colors[index % colors.length]} ${start}% ${at}%`; }).join(', ');
  return <div className="sad-donut-layout"><div className="sad-donut" style={{ background: total ? `conic-gradient(${gradient})` : '#e7ebf4' }}><div><small>{totalLabel}</small><strong>{valueFormatter(total)}</strong></div></div><div className="sad-donut-legend">{data.map((item, index) => <div key={item.name}><i style={{ background: colors[index % colors.length] }} /><span title={item.name}>{item.name}</span><strong>{number(item.value)}</strong></div>)}</div></div>;
}

function MiniTile({ label: title, value, tone = 'blue', detail }) {
  return <div className={`sad-mini sad-mini-${tone}`}><span>{title}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function DashboardOverview({ session }) {
  const permissions = {
    leads: can(session.user, 'leads.view') || can(session.user, 'customers.view'),
    quotations: can(session.user, 'quotations.view'),
    orders: can(session.user, 'salesOrders.view'),
    products: can(session.user, 'products.view'),
  };
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      permissions.leads ? loadPages((params) => api.leads(session.token, params), 'leads') : [],
      permissions.quotations ? loadPages((params) => api.quotations(session.token, params), 'quotations') : [],
      permissions.orders ? loadPages((params) => api.salesOrders(session.token, params), 'orders') : [],
      permissions.products ? loadPages((params) => api.products(session.token, params), 'products', 1000) : [],
    ]).then(([nextLeads, nextQuotations, nextOrders, nextProducts]) => {
      if (active) { setLeads(nextLeads); setQuotations(nextQuotations); setOrders(nextOrders); setProducts(nextProducts); }
    }).catch((error) => { if (active) toast.error(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.token, permissions.leads, permissions.quotations, permissions.orders, permissions.products]);

  const q = search.trim().toLowerCase();
  const visibleLeads = useMemo(() => leads.filter((lead) => inPeriod(lead.createdAt, period) && (!q || [lead.company, lead.contactName, lead.leadSource, lead.source].some((value) => String(value || '').toLowerCase().includes(q)))), [leads, period, q]);
  const visibleQuotations = useMemo(() => latestVersions(quotations).filter((quotation) => inPeriod(quotation.quotationDate || quotation.createdAt, period) && (!q || [quotation.company, quotation.quotationNumber, ...(quotation.items || []).map((item) => item.productName)].some((value) => String(value || '').toLowerCase().includes(q)))), [quotations, period, q]);
  const visibleOrders = useMemo(() => orders.filter((order) => inPeriod(order.orderDate || order.createdAt, period) && (!q || [order.company, order.orderNumber, ...(order.items || []).map((item) => item.productName)].some((value) => String(value || '').toLowerCase().includes(q)))), [orders, period, q]);
  const visibleProducts = useMemo(() => products.filter((product) => !q || [product.name, product.productName, product.productCode, product.category].some((value) => String(value || '').toLowerCase().includes(q))), [products, q]);

  const openLeads = visibleLeads.filter((lead) => !['Done', 'Lost'].includes(lead.status));
  const wonLeads = visibleLeads.filter((lead) => lead.status === 'Done');
  const lostLeads = visibleLeads.filter((lead) => lead.status === 'Lost');
  const pendingQuotes = visibleQuotations.filter((quotation) => ['Draft', 'Sent'].includes(quotation.status));
  const acceptedQuotes = visibleQuotations.filter((quotation) => quotation.status === 'Accepted');
  const acceptedValue = acceptedQuotes.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0);
  const pendingValue = pendingQuotes.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0);
  const quotedValue = visibleQuotations.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0);
  const decidedQuotes = visibleQuotations.filter((quotation) => ['Accepted', 'Rejected'].includes(quotation.status));
  const sourceData = groupBy(visibleLeads, (lead) => lead.leadSource || lead.source);
  const companyTypes = groupBy(visibleLeads, (lead) => lead.customerType);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dueToday = openLeads.filter((lead) => { const date = dateOf(lead.nextFollowUp); return date && date >= today && date < tomorrow; });
  const overdue = openLeads.filter((lead) => { const date = dateOf(lead.nextFollowUp); return date && date < today; });
  const upcoming = openLeads.filter((lead) => { const date = dateOf(lead.nextFollowUp); return date && date >= tomorrow; });
  const unscheduled = openLeads.filter((lead) => !lead.nextFollowUp);
  const quoteAging = [
    { name: '0–7 days', min: 0, max: 7 }, { name: '8–15 days', min: 8, max: 15 },
    { name: '16–30 days', min: 16, max: 30 }, { name: '30+ days', min: 31, max: Infinity },
  ].map((bucket) => {
    const records = pendingQuotes.filter((quotation) => { const date = dateOf(quotation.quotationDate || quotation.createdAt); const days = date ? Math.max(0, Math.floor((today - date) / 86400000)) : -1; return days >= bucket.min && days <= bucket.max; });
    return { ...bucket, value: records.length, amount: records.reduce((sum, quotation) => sum + Number(quotation.amount || 0), 0) };
  });
  const orderStatus = groupBy(visibleOrders, (order) => order.status);
  const lostSources = groupBy(lostLeads, (lead) => lead.leadSource || lead.source, 4);
  const inactivity = [30, 60, 90].map((days) => openLeads.filter((lead) => { const date = dateOf(lead.updatedAt || lead.createdAt); return date && (today - date) / 86400000 >= days; }).length);
  const productDemand = new Map();
  visibleQuotations.forEach((quotation) => (quotation.items || []).forEach((item) => { const name = label(item.productCode || item.productName, 'Unnamed product'); productDemand.set(name, (productDemand.get(name) || 0) + Number(item.quantity || 0)); }));
  const topProducts = [...productDemand].sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (!permissions.leads && !permissions.quotations && !permissions.orders && !permissions.products) return <div className="sad-dashboard"><p className="sad-empty">No dashboard data is available with your current permissions.</p></div>;

  return <div className="sad-dashboard">
    <div className="sad-top"><div><span className="sad-eyebrow">SALES OVERVIEW</span><h1>Sales &amp; Action Dashboard</h1><p>Sales performance, daily priorities and business health</p></div><div className="sad-toolbar"><label className="sad-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads, customers, quotations..." aria-label="Search dashboard data" /></label><label className="sad-period"><CalendarDays size={18} /><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Dashboard period"><option value="all">All time</option><option value="month">This month</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></label></div></div>
    {loading && <p className="sad-loading">Loading dashboard data…</p>}
    <div className="sad-stats">
      {permissions.leads && <Stat icon={UsersRound} title="Total leads" value={number(visibleLeads.length)} sub={`${number(openLeads.length)} open`} onClick={() => navigate('/leads')} />}
      {permissions.quotations && <Stat icon={FileText} title="Total quotations" value={number(visibleQuotations.length)} sub={money(quotedValue)} tone="purple" onClick={() => navigate('/quotations')} />}
      {permissions.quotations && <Stat icon={Clock3} title="Pending" value={number(pendingQuotes.length)} sub={money(pendingValue)} tone="orange" onClick={() => navigate('/quotations')} />}
      {permissions.leads && <Stat icon={CircleX} title="Lost leads" value={number(lostLeads.length)} sub={`${percent(lostLeads.length, visibleLeads.length)}% of leads`} tone="pink" onClick={() => navigate('/leads')} />}
      {permissions.leads && <Stat icon={CheckCircle2} title="Won leads" value={number(wonLeads.length)} sub={`${percent(wonLeads.length, visibleLeads.length)}% of leads`} tone="green" onClick={() => navigate('/leads')} />}
      {permissions.quotations && <Stat icon={Goal} title="Quote success" value={`${percent(acceptedQuotes.length, decidedQuotes.length)}%`} sub={`${number(acceptedQuotes.length)} accepted`} tone="blue" onClick={() => navigate('/quotations')} />}
    </div>
    <div className="sad-grid sad-grid-three">
      {permissions.leads && <Card icon={TrendingUp} title="Leads by source" className="sad-source"><BarList data={sourceData} /><div className="sad-card-total"><span>Total leads</span><strong>{number(visibleLeads.length)}</strong></div></Card>}
      {permissions.quotations && <Card icon={Goal} title="Quotation progress" eyebrow="Accepted quotation value" className="sad-progress"><div className="sad-progress-label"><span>Acceptance by value</span><strong>{percent(acceptedValue, quotedValue)}%</strong></div><div className="sad-progress-track"><i style={{ width: `${percent(acceptedValue, quotedValue)}%` }} /></div><div className="sad-mini-grid sad-mini-grid-three"><MiniTile label="Quoted" value={money(quotedValue)} /><MiniTile label="Accepted" value={money(acceptedValue)} tone="green" /><MiniTile label="Pending" value={money(pendingValue)} tone="orange" /></div></Card>}
      {permissions.leads && <Card icon={UsersRound} title="Customer types" eyebrow="Companies linked to leads" className="sad-customer"><Donut data={companyTypes} valueFormatter={number} totalLabel="Leads" /></Card>}
    </div>
    <div className="sad-grid sad-grid-four">
      {permissions.leads && <Card icon={CalendarDays} title="Follow-up summary" className="sad-followups" action={{ label: 'View leads', onClick: () => navigate('/leads') }}><div className="sad-mini-grid sad-mini-grid-four"><MiniTile label="Today" value={number(dueToday.length)} /><MiniTile label="Overdue" value={number(overdue.length)} tone="pink" /><MiniTile label="Upcoming" value={number(upcoming.length)} tone="green" /><MiniTile label="No date" value={number(unscheduled.length)} tone="neutral" /></div><div className="sad-list-title">Next actions</div><div className="sad-action-list">{[...overdue, ...dueToday, ...upcoming].slice(0, 3).map((lead) => <button key={lead._id} type="button" onClick={() => navigate('/leads')}><span><strong>{label(lead.company, 'Unnamed lead')}</strong><small>{lead.status} · {lead.assignedName || 'Unassigned'}</small></span><em className={dateOf(lead.nextFollowUp) < today ? 'overdue' : ''}>{dateOf(lead.nextFollowUp)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</em></button>)}{![...overdue, ...dueToday, ...upcoming].length && <p className="sad-empty">No scheduled follow-ups.</p>}</div></Card>}
      {permissions.quotations && <Card icon={Clock3} title="Pending quotation aging" className="sad-aging"><div className="sad-aging-labels"><span>Age bucket</span><span>Count</span><span>Amount</span></div>{quoteAging.map((bucket) => <div className="sad-aging-row" key={bucket.name}><span>{bucket.name}</span><div className="sad-aging-bar"><i style={{ width: `${Math.max(bucket.value ? 6 : 0, percent(bucket.value, pendingQuotes.length))}%` }} /></div><strong>{bucket.value}</strong><b>{money(bucket.amount)}</b></div>)}<div className="sad-card-total"><span>Total pending</span><strong>{number(pendingQuotes.length)} · {money(pendingValue)}</strong></div></Card>}
      {permissions.orders && <Card icon={ClipboardList} title="Sales order status" eyebrow="Recorded orders only" className="sad-orders"><div className="sad-mini-grid sad-mini-grid-two"><MiniTile label="Orders" value={number(visibleOrders.length)} /><MiniTile label="Order value" value={money(visibleOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0))} tone="green" /></div><BarList data={orderStatus} color="blue" /></Card>}
      {permissions.leads && permissions.quotations && <Card icon={TrendingUp} title="Sales conversion" className="sad-conversion"><div className="sad-funnel"><div><strong>{number(visibleLeads.length)}</strong><span>Leads</span></div><div><strong>{number(visibleQuotations.length)}</strong><span>Quotations</span></div><div><strong>{number(acceptedQuotes.length)}</strong><span>Accepted</span></div></div><div className="sad-mini-grid sad-mini-grid-two"><MiniTile label="Lead to quote" value={`${percent(visibleQuotations.length, visibleLeads.length)}%`} /><MiniTile label="Quote to accepted" value={`${percent(acceptedQuotes.length, visibleQuotations.length)}%`} tone="purple" /></div></Card>}
    </div>
    <div className="sad-grid sad-grid-four sad-bottom-grid">
      {permissions.leads && <Card icon={CircleX} title="Lost leads by source" className="sad-lost"><BarList data={lostSources} color="pink" empty="No lost leads in this period." /><div className="sad-card-total"><span>Total lost</span><strong>{number(lostLeads.length)}</strong></div></Card>}
      {permissions.quotations && <Card icon={TrendingUp} title="Open quotation pipeline" eyebrow="Potential value, not confirmed sales" className="sad-forecast"><div className="sad-mini-grid sad-mini-grid-two"><MiniTile label="Pending value" value={money(pendingValue)} tone="purple" /><MiniTile label="Sent value" value={money(pendingQuotes.filter((quote) => quote.status === 'Sent').reduce((sum, quote) => sum + Number(quote.amount || 0), 0))} tone="green" /></div><div className="sad-list-title">Largest pending quotes</div><div className="sad-action-list">{[...pendingQuotes].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 2).map((quote) => <button key={quote._id} type="button" onClick={() => navigate('/quotations')}><span><strong>{label(quote.company, 'Unnamed customer')}</strong><small>{quote.status}</small></span><b>{money(quote.amount)}</b></button>)}{!pendingQuotes.length && <p className="sad-empty">No pending quotations.</p>}</div></Card>}
      {permissions.leads && <Card icon={UsersRound} title="Lead inactivity" eyebrow="Open leads without an update" className="sad-inactive"><div className="sad-mini-grid sad-mini-grid-three"><MiniTile label="30+ days" value={number(inactivity[0])} tone="orange" /><MiniTile label="60+ days" value={number(inactivity[1])} tone="pink" /><MiniTile label="90+ days" value={number(inactivity[2])} tone="pink" /></div><div className="sad-list-title">Needs attention</div><div className="sad-action-list">{[...openLeads].filter((lead) => dateOf(lead.updatedAt || lead.createdAt)).sort((a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt)).slice(0, 2).map((lead) => <button key={lead._id} type="button" onClick={() => navigate('/leads')}><span><strong>{label(lead.company, 'Unnamed lead')}</strong><small>{lead.assignedName || 'Unassigned'}</small></span><em>{Math.max(0, Math.floor((today - new Date(lead.updatedAt || lead.createdAt)) / 86400000))}d</em></button>)}</div></Card>}
      {(permissions.products || permissions.quotations) && <Card icon={Package} title="Products & demand" eyebrow="Quotation items and product master" className="sad-products"><div className="sad-mini-grid sad-mini-grid-two">{permissions.products && <MiniTile label="Catalogue products" value={number(visibleProducts.length)} tone="orange" />}{permissions.quotations && <MiniTile label="Quoted products" value={number(productDemand.size)} tone="purple" />}</div><div className="sad-list-title">Most requested</div><div className="sad-action-list">{topProducts.map(([name, qty]) => <div key={name}><span><strong>{name}</strong><small>Quoted quantity</small></span><b>{number(qty)}</b></div>)}{!topProducts.length && <p className="sad-empty">No quotation item data.</p>}</div></Card>}
    </div>
    <p className="sad-footnote">Figures reflect the selected period and accessible CRM records. Quotation values are not invoiced revenue.</p>
  </div>;
}

export default DashboardOverview;
