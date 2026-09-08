import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { CopyPlus, Edit3, Mail, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../../../services/api.js";
import { AntDatePicker, LeadDropdown, PhoneLink } from "../CrmControls.jsx";
import { formatDisplayDate } from "../CrmUtils.jsx";

const quotationStatuses = ["Draft", "Sent", "Accepted", "Rejected"];
const emptyForm = { leadId: "", customerName: "", company: "", email: "", phone: "", items: [{ productId: "", quantity: 1 }], discountPercent: 0, quotationDate: dayjs().format("YYYY-MM-DD"), status: "Draft", revisedFromId: "" };

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function revisionChanges(current, previous) {
  if (!previous) return ["Original quotation created"];
  const changes = [];
  if (Number(current.discountPercent || 0) !== Number(previous.discountPercent || 0)) changes.push(`Discount changed from ${previous.discountPercent || 0}% to ${current.discountPercent || 0}%`);
  if (Number(current.amount || 0) !== Number(previous.amount || 0)) changes.push(`Total changed from ${formatCurrency(previous.amount)} to ${formatCurrency(current.amount)}`);
  if (current.status !== previous.status) changes.push(`Status changed from ${previous.status} to ${current.status}`);
  if (current.customerName !== previous.customerName || current.company !== previous.company || current.email !== previous.email || current.phone !== previous.phone) changes.push("Customer or contact details updated");
  const itemSnapshot = (quotation) => JSON.stringify((quotation.items || []).map((item) => ({ productId: String(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })).sort((a, b) => a.productId.localeCompare(b.productId)));
  if (itemSnapshot(current) !== itemSnapshot(previous)) changes.push("Products, quantities, or prices updated");
  return changes.length ? changes : ["Revision saved without pricing changes"];
}

function QuotationsPanel({ quotations, setQuotations, leads, token, isAdmin, products }) {
  const [dialog, setDialog] = useState(null);
  const [filter, setFilter] = useState("All");
  const [dateRange, setDateRange] = useState("month");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [form, setForm] = useState(emptyForm);
  const handledDeepLink = useRef(false);
  const quotationGroups = useMemo(() => {
    const grouped = new Map();
    quotations.forEach((quotation) => {
      const rootId = String(quotation.revisionRoot || quotation._id);
      if (!grouped.has(rootId)) grouped.set(rootId, []);
      grouped.get(rootId).push(quotation);
    });
    return [...grouped.entries()].map(([rootId, revisions]) => {
      const orderedRevisions = revisions.sort((a, b) => Number(a.revisionNumber || 0) - Number(b.revisionNumber || 0));
      return { rootId, revisions: orderedRevisions, latest: orderedRevisions.at(-1) };
    }).sort((a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt));
  }, [quotations]);
  const visibleQuotationGroups = useMemo(() => {
    return quotationGroups.filter((group) => filter === "All" || (filter === "Revised" ? group.revisions.length > 1 : group.latest.status === filter));
  }, [filter, quotationGroups]);

  useEffect(() => {
    const params = { page, limit: 10 };
    if (dateRange !== "all") {
      if (dateRange === "month") { params.dateFrom = dayjs().startOf("month").format("YYYY-MM-DD"); params.dateTo = dayjs().add(1, "month").startOf("month").format("YYYY-MM-DD"); }
      else if (dateRange === "lastMonth") { params.dateFrom = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"); params.dateTo = dayjs().startOf("month").format("YYYY-MM-DD"); }
      else if (dateRange === "lastYear") { params.dateFrom = dayjs().subtract(1, "year").startOf("year").format("YYYY-MM-DD"); params.dateTo = dayjs().startOf("year").format("YYYY-MM-DD"); }
      else if (dateRange === "today") { params.dateFrom = dayjs().format("YYYY-MM-DD"); params.dateTo = dayjs().add(1, "day").format("YYYY-MM-DD"); }
      else { params.dateFrom = dayjs().subtract(Number(dateRange) - 1, "day").format("YYYY-MM-DD"); params.dateTo = dayjs().add(1, "day").format("YYYY-MM-DD"); }
    }
    if (search.trim()) params.search = search.trim();
    api.quotations(token, params).then((response) => { setQuotations(response.quotations || []); setPagination(response.pagination || { total: response.quotations?.length || 0, totalPages: 1 }); }).catch((error) => toast.error(error.message));
  }, [dateRange, page, search, setQuotations, token]);
  const discountSuggestions = useMemo(() => [...new Set(
    quotations
      .map((quotation) => Number(quotation.discountPercent))
      .filter((discount) => Number.isFinite(discount) && discount > 0),
  )].sort((a, b) => a - b).slice(0, 5), [quotations]);

  function commitQuotations(updater) {
    setQuotations((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return next;
    });
  }

  function applyLead(leadId, base = emptyForm) {
    const lead = leads.find((item) => String(item._id) === String(leadId));
    if (!lead) return { ...base, leadId };
    const contact = lead.companyPersons?.[0] || {};
    return { ...base, leadId, customerName: lead.name || contact.name || "", company: lead.company === "N/A" ? "" : lead.company || "", email: lead.email || contact.email || "", phone: lead.phone || contact.contactNumber || "" };
  }

  function openCreate(leadId = "") {
    setForm(applyLead(leadId, emptyForm));
    setDialog({ mode: "create" });
  }

  function openEdit(quotation) {
    setForm({ leadId: quotation.leadId || "", customerName: quotation.customerName, company: quotation.company, email: quotation.email, phone: quotation.phone, items: quotation.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })) || [], discountPercent: quotation.discountPercent || 0, quotationDate: quotation.quotationDate?.slice(0, 10) || quotation.createdAt?.slice(0, 10) || dayjs().format("YYYY-MM-DD"), status: quotation.status, revisedFromId: "" });
    setDialog({ mode: "edit", quotation });
  }

  function openRevision(quotation) {
    setForm({ leadId: quotation.leadId || "", customerName: quotation.customerName, company: quotation.company, email: quotation.email, phone: quotation.phone, items: quotation.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })) || [{ productId: "", quantity: 1 }], discountPercent: quotation.discountPercent || 0, quotationDate: dayjs().format("YYYY-MM-DD"), status: "Draft", revisedFromId: quotation._id });
    setDialog({ mode: "revise", quotation });
  }

  useEffect(() => {
    if (handledDeepLink.current || !leads.length) return;
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId");
    const lead = leads.find((item) => String(item._id) === leadId);
    if (params.get("create") === "1" && leadId && lead) {
      handledDeepLink.current = true;
      const contact = lead.companyPersons?.[0] || {};
      setForm({ ...emptyForm, leadId, customerName: lead.name || contact.name || "", company: lead.company === "N/A" ? "" : lead.company || "", email: lead.email || contact.email || "", phone: lead.phone || contact.contactNumber || "" });
      setDialog({ mode: "create" });
      window.history.replaceState({}, "", "/quotations");
    }
  }, [leads]);

  async function updateStatus(quotation, status) {
    const id = quotation._id;
    if (pendingStatuses[id] || status === quotation.status) return;
    setPendingStatuses((current) => ({ ...current, [id]: status }));
    try {
      const result = await api.updateQuotationStatus(token, id, status);
      commitQuotations((current) => current.map((item) => item._id === id ? result.quotation : item));
      toast.success("Quotation status updated.");
    } catch (error) { toast.error(error.message); }
    finally { setPendingStatuses((current) => { const next = { ...current }; delete next[id]; return next; }); }
  }

  async function submitQuotation(event) {
    event.preventDefault();
    try {
      const result = dialog.mode === "edit" ? await api.updateQuotation(token, dialog.quotation._id, form) : await api.createQuotation(token, form);
      commitQuotations((current) => dialog.mode === "edit" ? current.map((item) => item._id === result.quotation._id ? result.quotation : item) : [result.quotation, ...current]);
      const message = dialog.mode === "revise" ? "Revised quotation created." : dialog.mode === "create" ? "Quotation added successfully." : "Quotation updated successfully.";
      setDialog(null);
      toast.success(message);
    } catch (error) { toast.error(error.message); }
  }

  async function deleteQuotation() {
    try {
      await api.deleteQuotation(token, dialog.quotation._id);
      commitQuotations((current) => current.filter((item) => item._id !== dialog.quotation._id));
      setDialog(null);
      toast.success("Quotation deleted successfully.");
    } catch (error) { toast.error(error.message); }
  }

  function updateItem(index, changes) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }

  const quotationSubtotal = form.items.reduce((total, item) => {
    const product = products.find((entry) => String(entry._id) === String(item.productId));
    return total + (product ? Number(item.quantity || 0) * Number(product.mrp ?? product.salePrice ?? 0) : 0);
  }, 0);
  const quotationDiscount = quotationSubtotal * Number(form.discountPercent || 0) / 100;
  const quotationTotal = Math.max(quotationSubtotal - quotationDiscount, 0);

  return (
    <div className="crm-content-inner quotation-management-page">
      <div className="section-heading">
        <div><h1>Quotations</h1><p>{isAdmin ? "View all team quotations, including every revision." : "View your quotations and their revision history."}</p></div>
        <button className="primary-action" type="button" onClick={() => openCreate()}><Plus size={17} />Add quotation</button>
      </div>
      <div className="quotation-toolbar">
        <div className="quotation-filter-tabs">
          {["All", ...quotationStatuses, "Revised"].map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <label className="user-search quotation-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search quotations" /></label>
        <label className="lead-date-filter"><span>Date</span><Select className="antd-crm-select quotation-date-select" value={dateRange} showSearch optionFilterProp="label" onChange={(value) => { setDateRange(value); setPage(1); }} options={[{ value: "month", label: "Current month" }, { value: "lastMonth", label: "Last month" }, { value: "lastYear", label: "Last year" }, { value: "today", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "all", label: "All time" }]} /></label>
      </div>
      <div className="quotation-table-wrap">
        <table className="quotation-table">
          <thead><tr><th>Lead / Customer</th><th>Version</th><th>Contact</th><th>Amount</th><th>Status</th><th>Quotation date</th><th>Created by</th><th className="actions-heading">Actions</th></tr></thead>
          <tbody>
            {visibleQuotationGroups.length ? visibleQuotationGroups.map((group) => { const quotation = group.latest; return (
              <tr className="quotation-row" key={group.rootId} onClick={() => setDialog({ mode: "history", group })}>
                <td><strong>{quotation.customerName}</strong><small>{quotation.company || "No company"}</small><small>{quotation.items?.map((item) => `${item.productName} x ${item.quantity}`).join(", ") || "No products"}</small></td>
                <td><div className="quotation-version-cell">{Number(quotation.revisionNumber) > 0 ? <span className="quotation-revision-badge">Revision {quotation.revisionNumber}</span> : <span className="quotation-original-badge">Original</span>}<small>{group.revisions.length} version{group.revisions.length === 1 ? "" : "s"}</small></div></td>
                <td><div className="quotation-contact"><span className={!quotation.email ? "is-empty" : ""}><Mail size={14} />{quotation.email || "No email"}</span><span className={!quotation.phone ? "is-empty" : ""}><Phone size={14} /><PhoneLink phone={quotation.phone} /></span></div></td>
                <td className="quotation-amount-cell"><strong>Rs. {Number(quotation.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{Number(quotation.discountPercent) > 0 && <small>{quotation.discountPercent}% discount</small>}</td>
                <td><div className="quotation-table-status" onClick={(event) => event.stopPropagation()}><LeadDropdown value={pendingStatuses[quotation._id] || quotation.status} options={quotationStatuses} onChange={(status) => updateStatus(quotation, status)} disabled={Boolean(pendingStatuses[quotation._id])} loading={Boolean(pendingStatuses[quotation._id])} ariaLabel={`Status for ${quotation.customerName}`} /></div></td>
                <td>{formatDisplayDate(quotation.quotationDate || quotation.createdAt)}</td><td>{quotation.createdByName || "You"}</td>
                <td><div className="table-actions" onClick={(event) => event.stopPropagation()}><button className="icon-action quotation" type="button" title={quotation.leadId ? "Create revised quotation" : "Link this older quotation to a lead before revising"} disabled={!quotation.leadId} onClick={() => openRevision(quotation)}><CopyPlus size={16} /></button><button className="icon-action edit" type="button" title="Edit latest quotation" onClick={() => openEdit(quotation)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete latest quotation" onClick={() => setDialog({ mode: "delete", quotation })}><Trash2 size={16} /></button></div></td>
              </tr>
            ); }) : <tr><td className="empty-table" colSpan="8">No quotations found for this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="lead-pagination"><span>{pagination.total || 0} quotation{pagination.total === 1 ? "" : "s"}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><strong>Page {page} of {pagination.totalPages || 1}</strong><button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
      {dialog?.mode === "history" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <div className="user-modal quotation-history-modal">
            <div className="modal-heading"><div><span className="dashboard-kicker">Revision history</span><h2>{dialog.group.latest.customerName}</h2><p>{dialog.group.revisions.length} saved version{dialog.group.revisions.length === 1 ? "" : "s"}</p></div><button className="modal-close" type="button" aria-label="Close revision history" onClick={() => setDialog(null)}><X size={18} /></button></div>
            <div className="quotation-history-list">
              {dialog.group.revisions.map((quotation, index, revisions) => ({ quotation, previous: revisions[index - 1] })).reverse().map(({ quotation, previous }, index) => (
                <article className={index === 0 ? "latest" : ""} key={quotation._id}>
                  <div className="quotation-history-heading"><div><strong>{Number(quotation.revisionNumber) > 0 ? `Revision ${quotation.revisionNumber}` : "Original quotation"}</strong>{index === 0 && <span>Latest</span>}</div><time>{formatDisplayDate(quotation.quotationDate || quotation.createdAt)}</time></div>
                  <div className="quotation-history-summary"><span>Total <strong>{formatCurrency(quotation.amount)}</strong></span><span>Discount <strong>{quotation.discountPercent || 0}%</strong></span><span>Status <strong>{quotation.status}</strong></span></div>
                  <div className="quotation-history-products">{quotation.items?.map((item) => <span key={`${quotation._id}-${item.productId}`}>{item.productName} × {item.quantity} at {formatCurrency(item.unitPrice)}</span>)}</div>
                  <div className="quotation-change-list"><strong>Changes in this version</strong>{revisionChanges(quotation, previous).map((change) => <span key={change}>{change}</span>)}</div>
                </article>
              ))}
            </div>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Close</button><button className="primary-action" type="button" disabled={!dialog.group.latest.leadId} onClick={() => openRevision(dialog.group.latest)}><CopyPlus size={16} />Create next revision</button></div>
          </div>
        </div>
      )}
      {dialog?.mode === "delete" && <div className="modal-backdrop" role="presentation"><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this quotation?</h2><p>This will permanently remove the quotation for <strong>{dialog.quotation.customerName}</strong>.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteQuotation}>Delete quotation</button></div></div></div>}
      {dialog && ["create", "edit", "revise"].includes(dialog.mode) && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <form className="user-modal quotation-modal" onSubmit={submitQuotation}>
            <div className="modal-heading"><div><span className="dashboard-kicker">Quotation workspace</span><h2>{dialog.mode === "create" ? "Add a new quotation" : dialog.mode === "revise" ? `Create revision ${(dialog.quotation.revisionNumber || 0) + 1}` : "Edit quotation"}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div>
            <div className="modal-fields">
              <label className="full-field">Lead<Select className="antd-crm-select quotation-lead-select" showSearch optionFilterProp="label" value={form.leadId || undefined} placeholder="Select a lead" disabled={dialog.mode !== "create" && Boolean(form.leadId)} options={leads.map((lead) => ({ value: lead._id, label: `${lead.name || "Unnamed lead"}${lead.company && lead.company !== "N/A" ? ` - ${lead.company}` : ""}` }))} onChange={(leadId) => setForm((current) => applyLead(leadId, current))} /></label>
              <label>Quotation date<AntDatePicker value={form.quotationDate} onChange={(quotationDate) => setForm({ ...form, quotationDate })} required /></label>
              <label>Customer name<input required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Taken from lead" /></label>
              <label>Company name<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Optional" /></label>
              <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="customer@company.com" /></label>
              <label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} placeholder="Optional" /></label>
              <div className="full-field quotation-items">
                <div className="quotation-items-heading"><strong>Products from Product Master</strong><button className="secondary-action" type="button" onClick={() => setForm({ ...form, items: [...form.items, { productId: "", quantity: 1 }] })}><Plus size={14} />Add product</button></div>
                {form.items.map((item, index) => { const product = products.find((entry) => String(entry._id) === String(item.productId)); return <div className="quotation-item-row" key={`${index}-${item.productId}`}><Select className="antd-crm-select quotation-product-select" showSearch optionFilterProp="label" value={item.productId || undefined} placeholder="Select product" options={products.filter((entry) => entry.isActive !== false).map((entry) => ({ value: entry._id, label: `${entry.description || entry.name} (${entry.partCode || entry.code}) - Rs. ${entry.mrp ?? entry.salePrice ?? 0}` }))} onChange={(productId) => updateItem(index, { productId })} /><input required min="0.01" step="0.01" type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" /><span>Rs. {product ? (Number(item.quantity || 0) * Number(product.mrp ?? product.salePrice ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}</span>{form.items.length > 1 && <button className="icon-action delete" type="button" title="Remove product" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button>}</div>; })}
                <div className="quotation-totals"><span>Subtotal <strong>Rs. {quotationSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span><span>Discount ({Number(form.discountPercent || 0)}%) <strong>- Rs. {quotationDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span><span className="quotation-total">Total <strong>Rs. {quotationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span></div>
              </div>
              <div className="quotation-discount-field">
                <label htmlFor="quotation-discount-input">Discount (%)</label>
                <input id="quotation-discount-input" inputMode="decimal" type="text" value={form.discountPercent} onChange={(event) => { const value = event.target.value; if (/^\d{0,3}(\.\d{0,2})?$/.test(value) && (value === "" || Number(value) <= 100)) setForm({ ...form, discountPercent: value }); }} placeholder="Enter discount percentage" />
                {discountSuggestions.length > 0 && <div className="discount-suggestions"><small>Previously used:</small>{discountSuggestions.map((discount) => <button type="button" key={discount} onClick={() => setForm({ ...form, discountPercent: discount })}>{discount}%</button>)}</div>}
              </div>
              <label>Status<LeadDropdown value={form.status} options={quotationStatuses} onChange={(status) => setForm({ ...form, status })} /></label>
            </div>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" type="submit" disabled={!products.length || !form.leadId}>{dialog.mode === "create" ? "Create quotation" : dialog.mode === "revise" ? "Create revised quote" : "Save changes"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default QuotationsPanel;
