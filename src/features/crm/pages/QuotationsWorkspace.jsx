import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { CopyPlus, Download, Edit3, Mail, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../../../services/api.js";
import { AntDatePicker, LeadDropdown, PhoneLink } from "../CrmControls.jsx";
import { formatDisplayDate } from "../CrmUtils.jsx";
import { navigate } from '../../../utils/navigation.js';

const quotationStatuses = ["Draft", "Sent", "Accepted", "Rejected"];
const emptyItem = { productId: "", description: "", quantity: 1, discountPercent: 0, discountAmount: 0, discountMode: "percent" };
const emptyForm = { leadId: "", contactPersonId: "", contactPersonKey: "", contactName: "", contactRole: "", company: "", email: "", phone: "", freightPacking: 0, generalDiscountPercent: 0, generalDiscountAmount: 0, generalDiscountMode: "percent", items: [emptyItem], quotationDate: dayjs().format("YYYY-MM-DD"), status: "Draft", revisedFromId: "" };

function savedQuotationItem(item) {
  return { productId: item.productId, description: item.description ?? item.productName ?? "", quantity: item.quantity, discountPercent: item.discountPercent || 0, discountAmount: item.discountAmount || 0, discountMode: "percent" };
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function quotationItemDescription(item) {
  return item.description || item.productName || "Product";
}

function quotationItemValue(item, productById) {
  const product = productById.get(String(item.productId)) || {};
  return item.productCode || product.partCode || product.code || product.name || item.productName || "Product";
}
function quotationConvertedAmount(quotation, productById) {
  return (quotation.items || []).reduce((total, item) => {
    const convertedUnitPrice = Number(productById.get(String(item.productId))?.convertedAmount ?? 0);
    return total + convertedUnitPrice * Number(item.quantity || 0);
  }, 0);
}

function quotationItemRate(item) {
  const quantity = Number(item.quantity || 0);
  const amount = Number(item.lineTotal ?? item.lineSubtotal ?? (quantity * Number(item.unitPrice || 0)));
  return quantity > 0 ? amount / quantity : Number(item.unitPrice || 0);
}

function revisionChanges(current, previous) {
  if (!previous) return ["Original quotation created"];
  const changes = [];
  if (Number(current.generalDiscountPercent || 0) !== Number(previous.generalDiscountPercent || 0)) changes.push(`General discount changed from ${previous.generalDiscountPercent || 0}% to ${current.generalDiscountPercent || 0}%`);
  if (Number(current.freightPacking || 0) !== Number(previous.freightPacking || 0)) changes.push(`Freight / Packing changed from ${formatCurrency(previous.freightPacking)} to ${formatCurrency(current.freightPacking)}`);
  if (Number(current.amount || 0) !== Number(previous.amount || 0)) changes.push(`Total changed from ${formatCurrency(previous.amount)} to ${formatCurrency(current.amount)}`);
  if (current.status !== previous.status) changes.push(`Status changed from ${previous.status} to ${current.status}`);
  if (current.contactName !== previous.contactName || current.contactRole !== previous.contactRole || current.company !== previous.company || current.email !== previous.email || current.phone !== previous.phone) changes.push("Company or person details updated");
  const itemSnapshot = (quotation) => JSON.stringify((quotation.items || []).map((item) => ({ productId: String(item.productId), description: item.description || "", quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), discountAmount: Number(item.discountAmount || 0) })).sort((a, b) => a.productId.localeCompare(b.productId)));
  if (itemSnapshot(current) !== itemSnapshot(previous)) changes.push("Product details or pricing updated");
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
  const [pendingDownloads, setPendingDownloads] = useState({});
  const [form, setForm] = useState(emptyForm);
  const handledDeepLink = useRef(false);
  const selectedLead = useMemo(() => leads.find((lead) => String(lead._id) === String(form.leadId)) || null, [form.leadId, leads]);
  const selectedLeadPeople = selectedLead?.companyPersons || [];
  const productOptions = useMemo(() => products.filter((product) => product.isActive !== false).map((product) => {
    const code = product.partCode || product.code || product.name || "Product";
    const description = product.description || product.name || "No description available";
    const price = Number(product.finalRate ?? product.mrp ?? product.salePrice ?? 0);
    return { value: product._id, label: code, description, price, searchText: `${code} ${description} ${product.brand || ""} ${price}` };
  }), [products]);
  const productById = useMemo(() => new Map(products.map((product) => [String(product._id), product])), [products]);
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
  function commitQuotations(updater) {
    setQuotations((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return next;
    });
  }

  function applyLead(leadId, base = emptyForm) {
    const lead = leads.find((item) => String(item._id) === String(leadId));
    if (!lead) return { ...base, leadId, contactPersonId: "", contactPersonKey: "", contactRole: "" };
    return { ...base, leadId, contactPersonId: "", contactPersonKey: "", contactName: "", contactRole: "", company: lead.company === "N/A" ? "" : lead.company || "", email: "", phone: "" };
  }

  function applyPerson(contactPersonId) {
    setForm((current) => {
      const lead = leads.find((item) => String(item._id) === String(current.leadId));
      const person = lead?.companyPersons?.find((item, index) => String(item._id || `legacy-${index}`) === String(contactPersonId));
      if (!person) return { ...current, contactPersonId: "", contactPersonKey: "", contactName: "", contactRole: "", email: "", phone: "" };
      return {
        ...current,
        contactPersonId: person._id || "",
        contactPersonKey: contactPersonId,
        contactName: person.name || "",
        contactRole: person.role || person.designation || "",
        email: person.email || "",
        phone: person.number || person.contactNumber || "",
      };
    });
  }

  function openCreate(leadId = "") {
    setForm(applyLead(leadId, emptyForm));
    setDialog({ mode: "create" });
  }

  function openEdit(quotation) {
    const lead = leads.find((item) => String(item._id) === String(quotation.leadId));
    const savedPersonId = lead?.companyPersons?.some((person) => String(person._id) === String(quotation.contactPersonId)) ? quotation.contactPersonId : "";
    setForm({ leadId: quotation.leadId || "", contactPersonId: savedPersonId, contactPersonKey: savedPersonId, contactName: quotation.contactName || "", contactRole: quotation.contactRole || "", company: quotation.company, email: quotation.email, phone: quotation.phone, freightPacking: quotation.freightPacking || 0, generalDiscountPercent: quotation.generalDiscountPercent || 0, generalDiscountAmount: quotation.generalDiscountAmount || 0, generalDiscountMode: "percent", items: quotation.items?.map(savedQuotationItem) || [], quotationDate: quotation.quotationDate?.slice(0, 10) || quotation.createdAt?.slice(0, 10) || dayjs().format("YYYY-MM-DD"), status: quotation.status, revisedFromId: "" });
    setDialog({ mode: "edit", quotation });
  }

  function openRevision(quotation) {
    const lead = leads.find((item) => String(item._id) === String(quotation.leadId));
    const savedPersonId = lead?.companyPersons?.some((person) => String(person._id) === String(quotation.contactPersonId)) ? quotation.contactPersonId : "";
    setForm({ leadId: quotation.leadId || "", contactPersonId: savedPersonId, contactPersonKey: savedPersonId, contactName: quotation.contactName || "", contactRole: quotation.contactRole || "", company: quotation.company, email: quotation.email, phone: quotation.phone, freightPacking: quotation.freightPacking || 0, generalDiscountPercent: quotation.generalDiscountPercent || 0, generalDiscountAmount: quotation.generalDiscountAmount || 0, generalDiscountMode: "percent", items: quotation.items?.map(savedQuotationItem) || [emptyItem], quotationDate: dayjs().format("YYYY-MM-DD"), status: "Draft", revisedFromId: quotation._id });
    setDialog({ mode: "revise", quotation });
  }

  useEffect(() => {
    if (handledDeepLink.current || !leads.length) return;
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId");
    const lead = leads.find((item) => String(item._id) === leadId);
    if (params.get("create") === "1" && leadId && lead) {
      handledDeepLink.current = true;
      setForm({ ...emptyForm, leadId, contactPersonId: "", contactPersonKey: "", contactName: "", contactRole: "", company: lead.company === "N/A" ? "" : lead.company || "", email: "", phone: "" });
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
      const payload = { ...form, generalDiscountPercent: effectiveGeneralDiscountPercent, generalDiscountAmount: generalDiscount, items: form.items.map((item) => ({ productId: item.productId, description: item.description, quantity: item.quantity, discountPercent: itemEffectiveDiscountPercent(item), discountAmount: itemDiscount(item), discountMode: item.discountMode })) };
      const result = dialog.mode === "edit" ? await api.updateQuotation(token, dialog.quotation._id, payload) : await api.createQuotation(token, payload);
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

  async function downloadPdf(quotation) {
    if (pendingDownloads[quotation._id]) return;
    setPendingDownloads((current) => ({ ...current, [quotation._id]: true }));
    try {
      const lead = leads.find((item) => String(item._id) === String(quotation.leadId)) || quotation.leadAddress;
      const { downloadQuotationPdf } = await import("../../../utils/quotationPdf.js");
      await downloadQuotationPdf({ quotation, lead, products });
      toast.success("Quotation PDF downloaded.");
    } catch (error) {
      toast.error(error.message || "Could not create the quotation PDF.");
    } finally {
      setPendingDownloads((current) => { const next = { ...current }; delete next[quotation._id]; return next; });
    }
  }

  function updateItem(index, changes) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }

  function selectProduct(index, productId) {
    const product = products.find((entry) => String(entry._id) === String(productId));
    updateItem(index, { productId, description: product?.description || product?.name || "" });
  }

  function itemSubtotal(item) {
    const product = products.find((entry) => String(entry._id) === String(item.productId));
    return product ? Number(item.quantity || 0) * Number(product.finalRate ?? product.mrp ?? product.salePrice ?? 0) : 0;
  }

  function itemMinimumPrice(item) {
    const product = productById.get(String(item.productId));
    return product ? Number(item.quantity || 0) * Number(product.convertedAmount ?? 0) : 0;
  }

  function itemDiscount(item) {
    const subtotal = itemSubtotal(item);
    return item.discountMode === "amount"
      ? Math.min(Math.max(Number(item.discountAmount || 0), 0), subtotal)
      : subtotal * Math.min(Math.max(Number(item.discountPercent || 0), 0), 100) / 100;
  }

  function itemEffectiveDiscountPercent(item) {
    const subtotal = itemSubtotal(item);
    return subtotal > 0 ? Number(((itemDiscount(item) / subtotal) * 100).toFixed(6)) : 0;
  }

  function updateItemDiscountAmount(index, value) {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) return;
    const item = form.items[index];
    if (value !== "" && Number(value) > itemSubtotal(item)) return;
    updateItem(index, { discountAmount: value, discountPercent: value === "" ? "" : itemEffectiveDiscountPercent({ ...item, discountAmount: value, discountMode: "amount" }), discountMode: "amount" });
  }

  function updateItemDiscountPercent(index, value) {
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(value) || (value !== "" && Number(value) > 100)) return;
    const item = form.items[index];
    updateItem(index, { discountPercent: value, discountAmount: value === "" ? "" : Number((itemSubtotal(item) * Number(value) / 100).toFixed(2)), discountMode: "percent" });
  }

  const quotationSubtotal = form.items.reduce((total, item) => total + itemSubtotal(item), 0);
  const minimumPrice = form.items.reduce((total, item) => total + itemMinimumPrice(item), 0);
  const productDiscount = form.items.reduce((total, item) => total + itemDiscount(item), 0);
  const productsAmount = Math.max(quotationSubtotal - productDiscount, 0);
  const generalDiscount = form.generalDiscountMode === "amount"
    ? Math.min(Math.max(Number(form.generalDiscountAmount || 0), 0), productsAmount)
    : productsAmount * Math.min(Math.max(Number(form.generalDiscountPercent || 0), 0), 100) / 100;
  const effectiveGeneralDiscountPercent = productsAmount > 0 ? Number(((generalDiscount / productsAmount) * 100).toFixed(6)) : 0;
  const freightPacking = Math.max(Number(form.freightPacking || 0), 0);
  const quotationTotal = Math.max(productsAmount - generalDiscount, 0) + freightPacking;
  const generalDiscountFactor = productsAmount > 0 ? Math.max(productsAmount - generalDiscount, 0) / productsAmount : 1;
  const productGst = form.items.reduce((total, item) => {
    const product = products.find((entry) => String(entry._id) === String(item.productId));
    const lineAmount = Math.max(itemSubtotal(item) - itemDiscount(item), 0);
    return total + lineAmount * generalDiscountFactor * Number(product?.taxRate || 0) / 100;
  }, 0);
  const gstTax = Number((productGst + freightPacking * 0.18).toFixed(2));
  const grandTotal = Number((quotationTotal + gstTax).toFixed(2));

  function updateFinalDiscountAmount(value) {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) return;
    if (value === "") return setForm((current) => ({ ...current, generalDiscountPercent: "", generalDiscountAmount: "", generalDiscountMode: "amount" }));
    const amount = Number(value);
    if (amount > productsAmount) return;
    const discountPercent = productsAmount > 0 ? Number(((amount / productsAmount) * 100).toFixed(6)) : 0;
    setForm((current) => ({ ...current, generalDiscountPercent: discountPercent, generalDiscountAmount: value, generalDiscountMode: "amount" }));
  }

  function updateFinalDiscountPercent(value) {
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(value) || (value !== "" && Number(value) > 100)) return;
    const discountAmount = value === "" ? "" : Number((productsAmount * Number(value) / 100).toFixed(2));
    setForm((current) => ({ ...current, generalDiscountPercent: value, generalDiscountAmount: discountAmount, generalDiscountMode: "percent" }));
  }

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
          <thead><tr><th>Company</th><th>Version</th><th>Person</th><th>Minimum price</th><th>Amount</th><th>Status</th><th>Quotation date</th><th>Created by</th><th className="actions-heading">Actions</th></tr></thead>
          <tbody>
            {visibleQuotationGroups.length ? visibleQuotationGroups.map((group) => { const quotation = group.latest; return (
              <tr className="quotation-row" key={group.rootId} onClick={() => setDialog({ mode: "history", group })}>
                <td><strong>{quotation.company || "No company"}</strong><small>{quotation.contactName || "No person selected"}</small>{quotation.items?.length ? <div className="quotation-table-products">{quotation.items.map((item, itemIndex) => <small key={`${item.productId}-${itemIndex}`} title={quotationItemDescription(item)}>{quotationItemValue(item, productById)} × {item.quantity}</small>)}</div> : <small>No products</small>}</td>
                <td><div className="quotation-version-cell">{Number(quotation.revisionNumber) > 0 ? <span className="quotation-revision-badge">Revision {quotation.revisionNumber}</span> : <span className="quotation-original-badge">Original</span>}<small>{group.revisions.length} version{group.revisions.length === 1 ? "" : "s"}</small></div></td>
                <td><div className="quotation-contact"><span className={!quotation.email ? "is-empty" : ""}><Mail size={14} />{quotation.email || "No email"}</span><span className={!quotation.phone ? "is-empty" : ""}><Phone size={14} /><PhoneLink phone={quotation.phone} /></span></div></td>
                <td className="quotation-amount-cell"><strong>Rs. {quotationConvertedAmount(quotation, productById).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td><td className="quotation-amount-cell"><strong>Rs. {Number(quotation.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{Number(quotation.generalDiscountPercent) > 0 && <small>{quotation.generalDiscountPercent}% general discount</small>}</td>
                <td><div className="quotation-table-status" onClick={(event) => event.stopPropagation()}><LeadDropdown value={pendingStatuses[quotation._id] || quotation.status} options={quotationStatuses} onChange={(status) => updateStatus(quotation, status)} disabled={Boolean(pendingStatuses[quotation._id])} loading={Boolean(pendingStatuses[quotation._id])} ariaLabel={`Status for ${quotation.company || "quotation"}`} /></div></td>
                <td>{formatDisplayDate(quotation.quotationDate || quotation.createdAt)}</td><td>{quotation.createdByName || "You"}</td>
                <td><div className="table-actions" onClick={(event) => event.stopPropagation()}><button className="icon-action download" type="button" title="Download quotation PDF" aria-label={`Download quotation for ${quotation.company || "company"}`} disabled={Boolean(pendingDownloads[quotation._id])} onClick={() => downloadPdf(quotation)}><Download size={16} /></button><button className="icon-action quotation" type="button" title={quotation.leadId ? "Create revised quotation" : "Link this older quotation to a lead before revising"} disabled={!quotation.leadId} onClick={() => openRevision(quotation)}><CopyPlus size={16} /></button><button className="icon-action edit" type="button" title="Edit latest quotation" onClick={() => openEdit(quotation)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete latest quotation" onClick={() => setDialog({ mode: "delete", quotation })}><Trash2 size={16} /></button></div></td>
              </tr>
            ); }) : <tr><td className="empty-table" colSpan="9">No quotations found for this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="lead-pagination"><span>{pagination.total || 0} quotation{pagination.total === 1 ? "" : "s"}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><strong>Page {page} of {pagination.totalPages || 1}</strong><button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
      {dialog?.mode === "history" && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <div className="user-modal quotation-history-modal">
            <div className="modal-heading"><div><span className="dashboard-kicker">Revision history</span><h2>{dialog.group.latest.company || "Unnamed company"}</h2><p>{dialog.group.revisions.length} saved version{dialog.group.revisions.length === 1 ? "" : "s"}</p></div><button className="modal-close" type="button" aria-label="Close revision history" onClick={() => setDialog(null)}><X size={18} /></button></div>
            <div className="quotation-history-list">
              {dialog.group.revisions.map((quotation, index, revisions) => ({ quotation, previous: revisions[index - 1] })).reverse().map(({ quotation, previous }, index) => (
                <article className={index === 0 ? "latest" : ""} key={quotation._id}>
                  <div className="quotation-history-heading"><div><strong>{Number(quotation.revisionNumber) > 0 ? `Revision ${quotation.revisionNumber}` : "Original quotation"}</strong>{index === 0 && <span>Latest</span>}</div><div><button className="icon-action download" type="button" title="Download this version as PDF" aria-label={`Download ${Number(quotation.revisionNumber) > 0 ? `revision ${quotation.revisionNumber}` : "original quotation"}`} disabled={Boolean(pendingDownloads[quotation._id])} onClick={() => downloadPdf(quotation)}><Download size={15} /></button><time>{formatDisplayDate(quotation.quotationDate || quotation.createdAt)}</time></div></div>
                  <div className="quotation-history-summary"><span>Total <strong>{formatCurrency(quotation.amount)}</strong></span><span>General discount <strong>{quotation.generalDiscountPercent || 0}%</strong></span><span>Status <strong>{quotation.status}</strong></span></div>
                  <div className="quotation-history-products">{quotation.items?.map((item) => <span key={`${quotation._id}-${item.productId}`}>{quotationItemDescription(item)} × {item.quantity} at {formatCurrency(quotationItemRate(item))}</span>)}</div>
                  <div className="quotation-change-list"><strong>Changes in this version</strong>{revisionChanges(quotation, previous).map((change) => <span key={change}>{change}</span>)}</div>
                </article>
              ))}
            </div>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Close</button><button className="primary-action" type="button" disabled={!dialog.group.latest.leadId} onClick={() => openRevision(dialog.group.latest)}><CopyPlus size={16} />Create next revision</button></div>
          </div>
        </div>
      )}
      {dialog?.mode === "delete" && <div className="modal-backdrop" role="presentation"><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this quotation?</h2><p>This will permanently remove the quotation for <strong>{dialog.quotation.company || "this company"}</strong>.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteQuotation}>Delete quotation</button></div></div></div>}
      {dialog && ["create", "edit", "revise"].includes(dialog.mode) && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <form className="user-modal quotation-modal" onSubmit={submitQuotation}>
            <div className="modal-heading"><div><span className="dashboard-kicker">Quotation workspace</span><h2>{dialog.mode === "create" ? "Add a new quotation" : dialog.mode === "revise" ? `Create revision ${(dialog.quotation.revisionNumber || 0) + 1}` : "Edit quotation"}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div>
            <div className="modal-fields">
              <label className="full-field">Company lead<Select className="antd-crm-select quotation-lead-select" showSearch optionFilterProp="label" value={form.leadId || undefined} placeholder="Select a company" disabled={dialog.mode !== "create" && Boolean(form.leadId)} options={leads.map((lead) => ({ value: lead._id, label: (lead.company && lead.company !== "N/A" ? lead.company : "Unnamed company").toLocaleUpperCase("en-IN") }))} popupRender={(menu) => <><div className="quotation-company-menu">{menu}</div><button className="dropdown-management-action quotation-add-company" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => navigate("/leads?create=1")}><Plus size={14} /> Add company</button></>} onChange={(leadId) => setForm((current) => applyLead(leadId, current))} /></label>
              <label className="full-field">Person<Select className="antd-crm-select quotation-lead-select" allowClear showSearch optionFilterProp="label" value={form.contactPersonKey || undefined} placeholder={!form.leadId ? "Select a company first" : selectedLeadPeople.length ? "Select a person" : "No people added to this company"} disabled={!form.leadId || !selectedLeadPeople.length} options={selectedLeadPeople.map((person, index) => ({ value: person._id || `legacy-${index}`, label: `${person.name || `Person ${index + 1}`}${person.role ? ` - ${person.role}` : ""}${person.number ? ` - ${person.number}` : ""}` }))} onChange={applyPerson} onClear={() => applyPerson("")} /></label>
              {selectedLead && <div className="full-field quotation-lead-summary"><strong>Company details</strong><div><span><small>Company</small>{selectedLead.company && selectedLead.company !== "N/A" ? selectedLead.company : "Not provided"}</span><span><small>Company type</small>{selectedLead.customerType || "Not provided"}</span><span><small>Address</small>{[selectedLead.address1, selectedLead.address2, selectedLead.area, selectedLead.city, selectedLead.state].filter(Boolean).join(", ") || "Not provided"}</span><span><small>People</small>{selectedLeadPeople.length}</span></div></div>}
              <label>Quotation date<AntDatePicker value={form.quotationDate} onChange={(quotationDate) => setForm({ ...form, quotationDate })} required /></label>
              <label>Person name<input className="quotation-name-input" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} placeholder="Taken from selected person" /></label>
              <label>Role<input value={form.contactRole} onChange={(event) => setForm({ ...form, contactRole: event.target.value })} placeholder="Taken from selected person" /></label>
              <label>Company name<input className="quotation-name-input" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Optional" /></label>
              <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="person@company.com" /></label>
              <label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} placeholder="Optional" /></label>
              <div className="full-field quotation-items">
                <div className="quotation-items-heading"><strong>Products from Product Master</strong><button className="secondary-action" type="button" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}><Plus size={14} />Add product</button></div>
                <div className="quotation-item-labels" aria-hidden="true"><span>Product</span><span>Description</span><span>Quantity</span><span>Discount %</span><span>Discount value</span><span>Minimum price</span><span>Rate</span><span>Amount</span><span /></div>
                {form.items.map((item, index) => { const subtotal = itemSubtotal(item); const discount = itemDiscount(item); const amount = Math.max(subtotal - discount, 0); const quantity = Number(item.quantity || 0); const rate = quantity > 0 ? amount / quantity : 0; return <div className="quotation-item-row" key={`${index}-${item.productId}`}><Select className="antd-crm-select quotation-product-select" showSearch optionFilterProp="searchText" value={item.productId || undefined} placeholder="Select product" options={productOptions} labelRender={({ value, label }) => <span className="quotation-selected-product" title={productOptions.find((option) => String(option.value) === String(value))?.description}>{label}</span>} optionRender={(option) => <div className="quotation-product-option" title={option.data.description}><strong>{option.data.label}</strong><small>Rs. {option.data.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</small></div>} onChange={(productId) => selectProduct(index, productId)} /><textarea maxLength={1000} rows={2} value={item.description || ""} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Product description (editable)" /><input required min="0.01" step="0.01" type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" /><input aria-label={`Discount percentage for item ${index + 1}`} inputMode="decimal" type="text" value={item.discountMode === "amount" ? itemEffectiveDiscountPercent(item) : item.discountPercent} onFocus={(event) => event.target.select()} onChange={(event) => updateItemDiscountPercent(index, event.target.value)} placeholder="0%" /><input aria-label={`Discount amount for item ${index + 1}`} inputMode="decimal" type="text" value={item.discountMode === "percent" ? discount.toFixed(2) : item.discountAmount} onFocus={(event) => event.target.select()} onChange={(event) => updateItemDiscountAmount(index, event.target.value)} placeholder="0.00" /><span className="quotation-minimum-price" title="Converted price × quantity, before margin and multiplier">{formatCurrency(itemMinimumPrice(item))}</span><span>{formatCurrency(rate)}</span><span className="quotation-line-total">{formatCurrency(amount)}</span>{form.items.length > 1 ? <button className="icon-action delete" type="button" title="Remove product" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button> : <span />}</div>; })}
                <div className="quotation-totals"><span className="quotation-minimum-total" title="Sum of converted prices × quantities, before margin and multiplier">Minimum price <strong>Rs. {minimumPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span>Products total <strong>Rs. {productsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span>Freight / Packing <strong>+ Rs. {freightPacking.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span>General discount ({effectiveGeneralDiscountPercent}%) <strong>- Rs. {generalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span>Taxable total <strong>Rs. {quotationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span>GST tax <strong>+ Rs. {gstTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span><span className="quotation-total">Grand total <strong>Rs. {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span></div>
              </div>
              <div className="full-field quotation-final-discount"><label>General discount %<input aria-label="General discount percentage" inputMode="decimal" type="text" value={form.generalDiscountMode === "amount" ? effectiveGeneralDiscountPercent : form.generalDiscountPercent} onFocus={(event) => event.target.select()} onChange={(event) => updateFinalDiscountPercent(event.target.value)} placeholder="0%" /></label><label>General discount amount<input aria-label="General discount amount" inputMode="decimal" type="text" value={form.generalDiscountMode === "percent" ? generalDiscount.toFixed(2) : form.generalDiscountAmount} onFocus={(event) => event.target.select()} onChange={(event) => updateFinalDiscountAmount(event.target.value)} placeholder="Rs. 0.00" /></label></div>
              <label>Freight / Packing amount<input min="0" step="0.01" type="number" value={form.freightPacking} onChange={(event) => setForm({ ...form, freightPacking: event.target.value })} placeholder="0.00" /></label>
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
