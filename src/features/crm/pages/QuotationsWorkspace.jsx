import { useEffect, useState } from "react";
import { Select } from "antd";
import { createRoot } from "react-dom/client";
import { toast } from "react-toastify";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { api } from "../../../services/api.js";
import { LeadDropdown, PhoneLink } from "../CrmControls.jsx";
import { formatDisplayDate } from "../CrmUtils.jsx";

const quotationStatuses = ["Draft", "Sent", "Accepted", "Rejected"];

function QuotationProductSelect({ value, products, onChange }) {
  const options = products.filter((product) => product.isActive !== false).map((product) => ({
    value: product._id,
    label: `${product.description || product.name} (${product.partCode || product.code})`,
    product,
  }));
  return (
    <Select
      className="antd-crm-select quotation-product-select"
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      placeholder="Select product"
      options={options}
      onChange={onChange}
      optionRender={(option) => (
        <span className="quotation-product-option">
          <strong>{option.data.product.description || option.data.product.name}</strong>
          <small>{option.data.product.partCode || option.data.product.code} - Rs. {option.data.product.mrp ?? option.data.product.salePrice ?? 0} / {option.data.product.unit || 'Piece'}</small>
        </span>
      )}
    />
  );
}

function QuotationsPanel({ quotations, setQuotations, token, isAdmin, products }) {
  const [dialog, setDialog] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [form, setForm] = useState({ customerName: "", company: "", email: "", phone: "", items: [], status: "Draft" });

  async function updateStatus(quotation, status) {
    const id = quotation._id;
    if (pendingStatuses[id] || status === quotation.status) return;
    setPendingStatuses((current) => ({ ...current, [id]: status }));
    try {
      const result = await api.updateQuotationStatus(token, id, status);
      setQuotations((current) => current.map((item) => item._id === id ? result.quotation : item));
      toast.success("Quotation status updated.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingStatuses((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  function openCreate() {
    setForm({ customerName: "", company: "", email: "", phone: "", items: [{ productId: "", quantity: 1 }], status: "Draft" });
    setDialog({ mode: "create" });
  }
  function openEdit(quotation) {
    setForm({ customerName: quotation.customerName, company: quotation.company, email: quotation.email, phone: quotation.phone, items: quotation.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })) || [], status: quotation.status });
    setDialog({ mode: "edit", quotation });
  }
  async function submitQuotation(event) {
    event.preventDefault();
    try {
      const result = dialog.mode === "create"
        ? await api.createQuotation(token, form)
        : await api.updateQuotation(token, dialog.quotation._id, form);
      setQuotations((current) => dialog.mode === "create" ? [result.quotation, ...current] : current.map((item) => item._id === result.quotation._id ? result.quotation : item));
      setDialog(null);
      toast.success(dialog.mode === "create" ? "Quotation added successfully." : "Quotation updated successfully.");
    } catch (error) { toast.error(error.message); }
  }
  async function deleteQuotation() {
    try {
      await api.deleteQuotation(token, dialog.quotation._id);
      setQuotations((current) => current.filter((item) => item._id !== dialog.quotation._id));
      setDialog(null);
      toast.success("Quotation deleted successfully.");
    } catch (error) { toast.error(error.message); }
  }
  function updateItem(index, changes) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }
  const quotationTotal = form.items.reduce((total, item) => {
    const product = products.find((entry) => String(entry._id) === String(item.productId));
    return total + (product ? Number(item.quantity || 0) * Number(product.mrp ?? product.salePrice ?? 0) : 0);
  }, 0);
  useEffect(() => {
    const nativeSelects = [...document.querySelectorAll(".quotation-item-row > select")];
    const mounts = nativeSelects.map((nativeSelect, index) => {
      nativeSelect.style.display = "none";
      const mount = document.createElement("span");
      mount.className = "quotation-product-mount";
      nativeSelect.parentElement.insertBefore(mount, nativeSelect);
      const root = createRoot(mount);
      root.render(
        <QuotationProductSelect
          value={form.items[index]?.productId}
          products={products}
          onChange={(productId) => updateItem(index, { productId })}
        />,
      );
      return { mount, nativeSelect, root };
    });
    return () => mounts.forEach(({ mount, nativeSelect, root }) => {
      root.unmount();
      nativeSelect.style.display = "";
      mount.remove();
    });
  }, [dialog, form.items, products]);
  return (
    <div className="crm-content-inner quotation-management-page">
      <div className="section-heading">
        <div><h1>Quotations</h1><p>{isAdmin ? "View and manage quotations from the entire team." : "View and manage quotations added by you."}</p></div>
        <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Add quotation</button>
      </div>
      <div className="quotation-table-wrap">
        <table className="quotation-table">
          <thead><tr><th>Customer</th><th>Contact</th><th>Amount</th><th>Status</th><th>Created by</th><th>Created</th><th className="actions-heading">Actions</th></tr></thead>
          <tbody>
            {quotations.length ? quotations.map((quotation) => (
              <tr key={quotation._id}>
                <td><strong>{quotation.customerName}</strong><small>{quotation.company || "No company"}</small><small>{quotation.items?.map((item) => `${item.productName} x ${item.quantity}`).join(", ") || "No products"}</small></td>
                <td><span>{quotation.email || "No email"}</span><small><PhoneLink phone={quotation.phone} /></small></td>
                <td>Rs. {Number(quotation.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td><div className="quotation-table-status"><LeadDropdown value={pendingStatuses[quotation._id] || quotation.status} options={quotationStatuses} onChange={(status) => updateStatus(quotation, status)} disabled={Boolean(pendingStatuses[quotation._id])} loading={Boolean(pendingStatuses[quotation._id])} ariaLabel={`Status for ${quotation.customerName}`} /></div></td>
                <td>{quotation.createdByName || "You"}</td>
                <td>{formatDisplayDate(quotation.createdAt)}</td>
                <td><div className="table-actions"><button className="icon-action edit" type="button" title="Edit quotation" disabled={Boolean(pendingStatuses[quotation._id])} onClick={() => openEdit(quotation)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete quotation" disabled={Boolean(pendingStatuses[quotation._id])} onClick={() => setDialog({ mode: "delete", quotation })}><Trash2 size={16} /></button></div></td>
              </tr>
            )) : <tr><td className="empty-table" colSpan="7">No quotations found.</td></tr>}
          </tbody>
        </table>
      </div>
      {dialog?.mode === "delete" && <div className="modal-backdrop" role="presentation"><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this quotation?</h2><p>This will permanently remove the quotation for <strong>{dialog.quotation.customerName}</strong>.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteQuotation}>Delete quotation</button></div></div></div>}
      {dialog && ["create", "edit"].includes(dialog.mode) && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <form className="user-modal quotation-modal" onSubmit={submitQuotation}>
            <div className="modal-heading"><div><span className="dashboard-kicker">Quotation workspace</span><h2>{dialog.mode === "create" ? "Add a new quotation" : "Edit quotation"}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div>
            <div className="modal-fields">
              <label>Customer name<input required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="Enter customer name" /></label>
              <label>Company name<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Optional" /></label>
              <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="customer@company.com" /></label>
              <label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} placeholder="Optional" /></label>
              <div className="full-field quotation-items">
                <div className="quotation-items-heading"><strong>Products from Product Master</strong><button className="secondary-action" type="button" onClick={() => setForm({ ...form, items: [...form.items, { productId: "", quantity: 1 }] })}><Plus size={14} />Add product</button></div>
                {form.items.map((item, index) => { const product = products.find((entry) => String(entry._id) === String(item.productId)); return <div className="quotation-item-row" key={`${index}-${item.productId}`}><select required value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })}><option value="">Select product</option>{products.filter((entry) => entry.isActive !== false).map((entry) => <option key={entry._id} value={entry._id}>{entry.description || entry.name} ({entry.partCode || entry.code}) - Rs. {entry.mrp ?? entry.salePrice ?? 0}</option>)}</select><input required min="0.01" step="0.01" type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" /><span>Rs. {product ? (Number(item.quantity || 0) * Number(product.mrp ?? product.salePrice ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}</span>{form.items.length > 1 && <button className="icon-action delete" type="button" title="Remove product" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button>}</div>; })}
                <div className="quotation-total">Total <strong>Rs. {quotationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
              </div>
              <label>Status<LeadDropdown value={form.status} options={quotationStatuses} onChange={(status) => setForm({ ...form, status })} /></label>
            </div>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" type="submit" disabled={!products.length}>{dialog.mode === "create" ? "Create quotation" : "Save changes"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}


export default QuotationsPanel;
