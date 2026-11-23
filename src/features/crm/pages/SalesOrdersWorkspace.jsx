import { useEffect, useState } from 'react';
import { AutoComplete, Select, Tooltip } from 'antd';
import { ClipboardList, Edit3, LoaderCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { api, getSession } from '../../../services/api.js';
import { can, isAdministrator } from '../../../utils/permissions.js';
import { formatDisplayDate } from '../CrmUtils.jsx';
import { LeadDropdown } from '../CrmControls.jsx';
import LoadingButton from '../../../components/LoadingButton.jsx';
import { navigate } from '../../../utils/navigation.js';

const emptyItem = () => ({ productId: '', productCode: '', productName: '', description: '', unit: '', quantity: 1, unitPrice: '', taxRate: 0 });
const emptyForm = () => ({ customerLeadId: '', contactPersonId: '', contactPersonKey: '', company: '', contactName: '', email: '', phone: '', address: '', orderDate: dayjs().format('YYYY-MM-DD'), status: 'Pending', freightPacking: 0, notes: '', items: [emptyItem()] });
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const orderStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];

function orderTotal(form) {
  return Number(form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0) + (Number(form.freightPacking) || 0));
}

function SalesOrdersWorkspace({ token }) {
  const user = getSession()?.user;
  const showAmount = isAdministrator(user);
  const canCreate = can(user, 'salesOrders.create');
  const canEdit = can(user, 'salesOrders.edit');
  const canDelete = can(user, 'salesOrders.delete');
  const [orders, setOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState({});
  const dialogMode = dialog?.mode;
  const selectedCompany = companies.find((lead) => String(lead._id) === String(form.customerLeadId));
  const companyPeople = selectedCompany?.companyPersons || [];
  const selectedPersonKey = companyPeople.map((person, index) => ({ person, key: person._id || `legacy-${index}` })).find(({ person, key }) => String(key) === String(form.contactPersonKey) || (!form.contactPersonKey && person.name?.trim().toLowerCase() === form.contactName.trim().toLowerCase()))?.key || '';
  const savedCompanyOption = dialog?.mode === 'edit' && form.company && !selectedCompany
    ? { value: form.customerLeadId || `legacy:${dialog.order._id}`, label: form.company }
    : null;
  const companyOptions = [...companies.map((lead) => ({ value: lead._id, label: (lead.company && lead.company !== 'N/A' ? lead.company : 'Unnamed company').toLocaleUpperCase('en-IN') })), ...(savedCompanyOption ? [savedCompanyOption] : [])];
  const productOptions = products.filter((product) => product.isActive !== false).map((product) => {
    const code = product.partCode || product.code || product.name || 'Product';
    const description = product.description || product.name || '';
    const price = Number(product.finalRate ?? product.mrp ?? product.salePrice ?? 0);
    return { value: code, label: code, productId: product._id, description, price, searchText: `${code} ${product.name || ''} ${description} ${product.brand || ''}`.toLowerCase() };
  });

  useEffect(() => {
    if (!dialogMode) return undefined;
    let active = true;
    setLoadingCompanies(true);
    async function loadCompanies() {
      try {
        const first = await api.leads(token, { page: 1, limit: 100 });
        const totalPages = first.pagination?.totalPages || 1;
        const remaining = totalPages > 1 ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => api.leads(token, { page: index + 2, limit: 100 }))) : [];
        if (active) setCompanies([...(first.leads || []), ...remaining.flatMap((page) => page.leads || [])]);
      } catch (error) { if (active) toast.error(error.message); }
      finally { if (active) setLoadingCompanies(false); }
    }
    loadCompanies();
    return () => { active = false; };
  }, [dialogMode, token]);

  useEffect(() => {
    if (!dialogMode) return undefined;
    let active = true;
    setLoadingProducts(true);
    async function loadProducts() {
      try {
        const first = await api.products(token, { page: 1, limit: 1000 });
        const totalPages = first.pagination?.totalPages || 1;
        const remaining = totalPages > 1 ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => api.products(token, { page: index + 2, limit: 1000 }))) : [];
        if (active) setProducts([...(first.products || []), ...remaining.flatMap((page) => page.products || [])]);
      } catch (error) { if (active) toast.error(error.message); }
      finally { if (active) setLoadingProducts(false); }
    }
    loadProducts();
    return () => { active = false; };
  }, [dialogMode, token]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.salesOrders(token, { page: 1, limit: 100, search: search.trim(), status: status === 'All' ? '' : status })
        .then((response) => { if (active) setOrders(response.orders || []); })
        .catch((error) => { if (active) toast.error(error.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, status, token]);

  function openCreate() {
    setForm(emptyForm());
    setDialog({ mode: 'create' });
  }

  function openEdit(order) {
    setForm({
      customerLeadId: order.customerLeadId || order.leadId || '', contactPersonId: order.contactPersonId || '', contactPersonKey: order.contactPersonId || '',
      company: order.company || '', contactName: order.contactName || '', email: order.email || '', phone: order.phone || '',
      address: order.address || '', orderDate: dayjs(order.orderDate || order.createdAt).format('YYYY-MM-DD'), status: order.status || 'Pending',
      freightPacking: order.freightPacking || 0, notes: order.notes || '',
      items: order.items?.length ? order.items.map((item) => ({ ...item, quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? '' })) : [emptyItem()],
    });
    setDialog({ mode: 'edit', order });
  }

  function selectCompany(customerLeadId) {
    const lead = companies.find((item) => String(item._id) === String(customerLeadId));
    if (!lead) return;
    setForm((current) => ({ ...current, customerLeadId, contactPersonId: '', contactPersonKey: '', company: lead.company === 'N/A' ? '' : lead.company || '', contactName: '', email: '', phone: '', address: [lead.address1, lead.address2, lead.area, lead.city, lead.state].filter(Boolean).join(', ') }));
  }

  function selectPerson(contactPersonKey) {
    const person = companyPeople.find((item, index) => String(item._id || `legacy-${index}`) === String(contactPersonKey));
    setForm((current) => person ? { ...current, contactPersonId: person._id || '', contactPersonKey, contactName: person.name || '', email: person.email || '', phone: person.number || person.contactNumber || '' } : { ...current, contactPersonId: '', contactPersonKey: '', contactName: '', email: '', phone: '' });
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (dialog.mode === 'create' && !form.customerLeadId) return toast.error('Select a company for this sales order.');
    if (form.items.some((item) => !String(item.productName || '').trim() || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || item.unitPrice === '' || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0)) return toast.error('Enter a product, quantity, and valid rate for every item.');
    setSaving(true);
    try {
      const payload = { ...form, items: form.items.map((item) => ({ ...item, productName: item.productName.trim() })) };
      const result = dialog.mode === 'create'
        ? await api.createSalesOrder(token, payload)
        : await api.updateSalesOrder(token, dialog.order._id, payload);
      setOrders((current) => dialog.mode === 'create'
        ? [result.order, ...current.filter((order) => order._id !== result.order._id)]
        : current.map((order) => order._id === result.order._id ? result.order : order));
      setDialog(null);
      toast.success(dialog.mode === 'create' ? 'Sales order added.' : 'Sales order updated.');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    try {
      await api.deleteSalesOrder(token, deleteDialog._id);
      setOrders((current) => current.filter((order) => order._id !== deleteDialog._id));
      setDeleteDialog(null);
      toast.success('Sales order deleted.');
    } catch (error) { toast.error(error.message); }
  }

  async function updateStatus(order, nextStatus) {
    if (nextStatus === order.status || pendingStatuses[order._id]) return;
    setPendingStatuses((current) => ({ ...current, [order._id]: true }));
    try {
      const result = await api.updateSalesOrderStatus(token, order._id, nextStatus);
      setOrders((current) => current.map((item) => item._id === order._id ? result.order : item));
      toast.success('Sales order status updated.');
    } catch (error) { toast.error(error.message); }
    finally { setPendingStatuses((current) => { const next = { ...current }; delete next[order._id]; return next; }); }
  }

  function updateItem(index, changes) {
    setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }

  function changeProduct(index, productName) {
    updateItem(index, { productId: '', productCode: '', productName, description: '', unit: '', unitPrice: '', taxRate: 0 });
  }

  function selectProduct(index, productId) {
    const product = products.find((item) => String(item._id) === String(productId));
    if (!product) return;
    const code = product.partCode || product.code || product.name || 'Product';
    updateItem(index, { productId: product._id, productCode: code, productName: code, description: product.description || product.name || '', unit: product.unit || '', unitPrice: Number(product.finalRate ?? product.mrp ?? product.salePrice ?? 0), taxRate: product.taxRate ?? 0 });
  }

  return <div className="crm-content-inner sales-orders-page">
    <div className="section-heading"><div><h1>Sales Orders</h1><p>Orders are added automatically when a lead reaches Done or a quotation is accepted, or created directly here.</p></div>{canCreate && <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Add sales order</button>}</div>
    <div className="sales-orders-toolbar"><label className="user-search sales-orders-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, company, or product" />{loading && <LoaderCircle className="module-search-spinner" size={15} aria-label="Searching" />}</label><Select className="antd-crm-select sales-orders-status-filter" aria-label="Filter sales orders by status" value={status} onChange={setStatus} options={['All', ...orderStatuses].map((item) => ({ value: item, label: item === 'All' ? 'All statuses' : item }))} optionRender={(option) => <span className={`sales-orders-filter-option status-${String(option.data.value).toLowerCase()}`}><i />{option.data.label}</span>} labelRender={(option) => <span className={`sales-orders-filter-label status-${String(option.value).toLowerCase()}`}><i />{option.label}</span>} /></div>
    <div className="sales-orders-table-wrap"><table className="sales-orders-table"><thead><tr><th scope="col">S.No.</th><th>Order</th><th>Date</th><th>Customer</th><th>Lead</th><th>Products</th>{showAmount && <th>Amount</th>}<th>Status</th>{(canEdit || canDelete) && <th className="actions-heading">Actions</th>}</tr></thead><tbody>{orders.length ? orders.map((order, index) => { const leadOnly = Boolean(order.leadId) && order.source !== 'quotation-accepted'; const productCodes = (order.items || []).map((item) => item.productCode || item.productName).filter(Boolean); return <tr key={order._id} data-record-id={order._id}><td>{index + 1}</td><td><strong className="sales-order-number">{order.orderNumber}</strong><small>{order.source === 'lead-stage' ? 'Created when lead was Done' : order.source === 'lead-action' ? 'Created from lead' : order.source === 'quotation-accepted' ? 'Created from accepted quotation' : 'Direct order'}</small></td><td>{formatDisplayDate(order.orderDate || order.createdAt)}</td><td><strong className="sales-order-company">{order.company}</strong><small>{order.contactName || order.email || order.phone || 'No contact details'}</small></td><td>{order.leadId ? order.leadName || 'Linked lead' : <span className="sales-order-direct">Direct</span>}</td><td>{leadOnly ? '—' : productCodes.length > 1 ? <Tooltip title={productCodes.slice(1).join(', ')}><span className="sales-order-products">{productCodes[0]}…</span></Tooltip> : productCodes[0] || '—'}</td>{showAmount && <td><strong>{leadOnly ? '—' : currency.format(Number(order.amount || 0))}</strong></td>}<td><div onClick={(event) => event.stopPropagation()}><LeadDropdown value={order.status} options={orderStatuses} onChange={(nextStatus) => updateStatus(order, nextStatus)} disabled={!canEdit || Boolean(pendingStatuses[order._id])} loading={Boolean(pendingStatuses[order._id])} ariaLabel={`Status for ${order.orderNumber}`} /></div></td>{(canEdit || canDelete) && <td><div className="table-actions">{canEdit && !leadOnly && <button className="icon-action edit" type="button" title="Edit sales order" aria-label={`Edit sales order ${order.orderNumber}`} onClick={() => openEdit(order)}><Edit3 size={15} /></button>}{canDelete && <button className="icon-action delete" type="button" title="Delete sales order" aria-label={`Delete sales order ${order.orderNumber}`} onClick={() => setDeleteDialog(order)}><Trash2 size={15} /></button>}</div></td>}</tr>; }) : <tr><td className="sales-orders-empty" colSpan={7 + Number(showAmount) + Number(canEdit || canDelete)}>{loading ? 'Loading sales orders…' : <><ClipboardList size={22} /><span>No sales orders found.</span>{canCreate && <button type="button" onClick={openCreate}>Create a direct sales order</button>}</>}</td></tr>}</tbody></table></div>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && setDialog(null)}><form className="user-modal sales-order-modal" onSubmit={submitOrder}><div className="modal-heading"><div><span className="dashboard-kicker">Sales order</span><h2>{dialog.mode === 'create' ? 'Add direct sales order' : `Edit ${dialog.order.orderNumber}`}</h2><p>Select a company and person. Direct orders keep their own products and rates.</p></div><button className="modal-close" type="button" aria-label="Close sales order form" disabled={saving} onClick={() => setDialog(null)}><X size={18} /></button></div><div className="modal-fields sales-order-fields">
      <label className="full-field">Company *<Select className="antd-crm-select sales-order-company-select" showSearch optionFilterProp="label" value={form.customerLeadId || savedCompanyOption?.value || undefined} placeholder={loadingCompanies ? 'Loading companies...' : 'Select a company'} loading={loadingCompanies} disabled={dialog.mode === 'edit' && dialog.order.source !== 'manual'} options={companyOptions} popupRender={(menu) => <>{menu}{can(user, 'leads.create') && <button className="dropdown-management-action quotation-add-company" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => navigate('/leads?create=1')}><Plus size={14} /> Add company</button>}</>} onChange={selectCompany} /></label>
      <label className="full-field">Person<Select className="antd-crm-select sales-order-company-select" allowClear showSearch optionFilterProp="label" value={selectedPersonKey || undefined} placeholder={!form.customerLeadId ? 'Select a company first' : loadingCompanies ? 'Loading people...' : companyPeople.length ? 'Select a person' : 'No people added to this company'} disabled={!selectedCompany || !companyPeople.length} options={companyPeople.map((person, index) => ({ value: person._id || `legacy-${index}`, label: `${person.name || `Person ${index + 1}`}${person.role ? ` - ${person.role}` : ''}${person.number ? ` - ${person.number}` : ''}` }))} onChange={selectPerson} onClear={() => selectPerson('')} /></label>
      {selectedCompany && <div className="full-field quotation-lead-summary"><strong>Company details</strong><div><span><small>Company</small>{selectedCompany.company || 'Not provided'}</span><span><small>Company type</small>{selectedCompany.customerType || 'Not provided'}</span><span><small>Address</small>{[selectedCompany.address1, selectedCompany.address2, selectedCompany.area, selectedCompany.city, selectedCompany.state].filter(Boolean).join(', ') || 'Not provided'}</span><span><small>People</small>{companyPeople.length}</span></div></div>}
      <label>Person name<input maxLength={120} value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value, contactPersonId: '', contactPersonKey: '' })} placeholder="Taken from selected person" /></label>
      <label>Company name<input required maxLength={120} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Taken from selected company" /></label>
      <label>Email<input type="email" maxLength={160} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" /></label>
      <label>Phone<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone number" /></label>
      <label>Order date<input type="date" required value={form.orderDate} onChange={(event) => setForm({ ...form, orderDate: event.target.value })} /></label>
      <label>Status<LeadDropdown value={form.status} options={orderStatuses} onChange={(status) => setForm({ ...form, status })} ariaLabel="Sales order status" /></label>
      <label className="full-field">Address<textarea maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Billing or delivery address" /></label>
      <div className="full-field sales-order-items"><div className="sales-order-items-heading"><strong>Products *</strong></div><div className="sales-order-item-labels"><span>Product</span><span>Description</span><span>Qty</span><span>Rate</span><span>GST %</span><span>Amount</span></div>{form.items.map((item, index) => <div className="sales-order-item" key={index}><AutoComplete className="antd-crm-select sales-order-product-select" value={item.productName || ''} placeholder={loadingProducts ? 'Loading products...' : 'Select or type product'} options={productOptions} filterOption={(input, option) => option.searchText.includes(input.toLowerCase())} optionRender={(option) => <div className="quotation-product-option" title={option.data.description}><strong>{option.data.label}</strong><small>{option.data.description || 'Product Master'} · {currency.format(option.data.price)}</small></div>} onChange={(value) => changeProduct(index, value)} onSelect={(_value, option) => selectProduct(index, option.productId)} aria-label={`Product ${index + 1} name`} /><input className="sales-order-description" maxLength={1000} value={item.description || ''} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Description" aria-label={`Product ${index + 1} description`} /><input className="sales-order-quantity" min="0.01" step="any" required type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" aria-label={`Product ${index + 1} quantity`} /><input className="sales-order-rate" min="0" step="any" required type="number" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} placeholder="Rate" aria-label={`Product ${index + 1} rate`} /><input className="sales-order-tax" min="0" max="100" step="any" type="number" value={item.taxRate} onChange={(event) => updateItem(index, { taxRate: event.target.value })} placeholder="GST" aria-label={`Product ${index + 1} GST percentage`} /><span className="sales-order-line-total">{currency.format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>{form.items.length > 1 && <button className="icon-action delete" type="button" aria-label={`Remove product ${index + 1}`} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><X size={14} /></button>}</div>)}<div className="sales-order-product-footer"><button className="secondary-action sales-order-add-product" type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }))}><Plus size={14} />Add product</button></div></div>
      <label>Freight / packing<input min="0" step="any" type="number" value={form.freightPacking} onChange={(event) => setForm({ ...form, freightPacking: event.target.value })} /></label>
      <label>Total amount<input readOnly value={currency.format(orderTotal(form))} /></label>
      <label className="full-field">Notes<textarea maxLength={3000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional notes for this order" /></label>
    </div><div className="modal-footer"><button className="secondary-action" type="button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><LoadingButton loading={saving} loadingText="Saving order…">{dialog.mode === 'create' ? 'Create sales order' : 'Save changes'}</LoadingButton></div></form></div>}

    {deleteDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteDialog(null)}><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this sales order?</h2><p>This will permanently remove <strong>{deleteDialog.orderNumber}</strong> for {deleteDialog.company}.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDeleteDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={confirmDelete}>Delete sales order</button></div></div></div>}
  </div>;
}

export default SalesOrdersWorkspace;
