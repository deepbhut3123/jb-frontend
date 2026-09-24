import { Dropdown, Select } from 'antd';
import { ChevronDown, Download, Edit3, FileDown, Package, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { API_URL, api } from '../services/api.js';
import { exportProductsCsv, importProductsCsv } from '../utils/productCsv.js';

const emptyProduct = { partCode: '', description: '', hsnCode: '', brand: '', category: '', subCategory: '', subSubCategory: '', image: '', taxRate: 18, mrp: '', dollarAmount: '', marginPercent: '', isActive: true };
const taxOptions = [0, 5, 12, 18, 28].map((value) => ({ value, label: `${value}% GST` }));
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const editableFields = ['partCode', 'description', 'brand', 'category', 'subCategory', 'subSubCategory', 'hsnCode', 'taxRate', 'mrp', 'dollarAmount', 'marginPercent'];
function productDraft(product) {
  return { partCode: product.partCode || product.code || '', description: product.description || product.name || '', brand: product.brand || '', category: product.category || '', subCategory: product.subCategory || '', subSubCategory: product.subSubCategory || '', hsnCode: product.hsnCode || '', taxRate: product.taxRate ?? 18, mrp: product.mrp ?? product.salePrice ?? '', dollarAmount: product.dollarAmount ?? '', marginPercent: product.marginPercent ?? '' };
}
function productImageUrl(image) {
  if (!image) return '';
  return image.startsWith('http') ? image : `${API_URL}${image.replace(/^\/+/, '')}`;
}

function ProductSelect({ value, options, onChange, placeholder, disabled = false }) {
  return <Select className="antd-crm-select product-form-select" showSearch optionFilterProp="label" value={value === '' || value === null || value === undefined ? undefined : value} options={options} onChange={onChange} placeholder={placeholder} disabled={disabled} />;
}

function ProductMasterPanel({ products, setProducts, categories, token }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState({});
  const [bulkOriginals, setBulkOriginals] = useState({});
  const importInput = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [pricingSettings, setPricingSettings] = useState({ dollarRate: 1, multiplier: 1 });
  useEffect(() => {
    const params = { page, limit: 10, status: status === 'all' ? undefined : status, search: search.trim() };
    api.products(token, params).then((response) => { setProducts(response.products || []); setPagination(response.pagination || { page, total: response.products?.length || 0, totalPages: 1 }); }).catch((error) => toast.error(error.message));
  }, [page, search, setProducts, status, token]);
  useEffect(() => {
    api.pricingSettings(token).then((response) => setPricingSettings(response.settings || { dollarRate: 1, multiplier: 1 })).catch((error) => toast.error(error.message));
  }, [token]);
  useEffect(() => {
    if (!imageFile) { setImagePreview(productImageUrl(form.image)); return undefined; }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.image, imageFile]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesStatus = status === 'all' || (status === 'active' ? product.isActive !== false : product.isActive === false);
    const query = search.trim().toLowerCase();
    const searchable = [product.partCode, product.code, product.description, product.name, product.brand, product.category, product.subCategory, product.subSubCategory, product.hsnCode].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && (!query || searchable.includes(query));
  }), [products, search, status]);
  const displayedProducts = bulkEditing ? products.filter((product) => bulkOriginals[product._id]) : filteredProducts;
  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({ value: category.name, label: category.name }));
    if (form.category && !options.some((option) => option.value === form.category)) options.push({ value: form.category, label: `${form.category} (legacy)` });
    return options;
  }, [categories, form.category]);
  const selectedCategory = categories.find((category) => category.name === form.category);
  const subCategoryOptions = useMemo(() => {
    const options = (selectedCategory?.subCategories || []).map((item) => ({ value: item.name, label: item.name }));
    if (form.subCategory && !options.some((option) => option.value === form.subCategory)) options.push({ value: form.subCategory, label: `${form.subCategory} (legacy)` });
    return options;
  }, [form.subCategory, selectedCategory]);
  const selectedSubCategory = selectedCategory?.subCategories?.find((item) => item.name === form.subCategory);
  const subSubCategoryOptions = useMemo(() => {
    const options = (selectedSubCategory?.subSubCategories || []).map((item) => ({ value: item.name, label: item.name }));
    if (form.subSubCategory && !options.some((option) => option.value === form.subSubCategory)) options.push({ value: form.subSubCategory, label: `${form.subSubCategory} (legacy)` });
    return options;
  }, [form.subSubCategory, selectedSubCategory]);
  function startBulkEdit() {
    const drafts = Object.fromEntries(filteredProducts.map((product) => [product._id, productDraft(product)]));
    setBulkOriginals(drafts);
    setBulkDrafts(drafts);
    setBulkEditing(true);
  }
  function cancelBulkEdit() { setBulkEditing(false); setBulkDrafts({}); setBulkOriginals({}); }
  function updateBulkDraft(id, changes) {
    setBulkDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  }
  async function saveBulkEdit() {
    const changed = displayedProducts.filter((product) => editableFields.some((key) => String(bulkDrafts[product._id]?.[key] ?? '') !== String(bulkOriginals[product._id]?.[key] ?? '')));
    if (!changed.length) { cancelBulkEdit(); return; }
    for (const product of changed) {
      const draft = bulkDrafts[product._id];
      if (!draft.partCode.trim() || !draft.description.trim() || !draft.category.trim() || draft.mrp === '' || !Number.isFinite(Number(draft.mrp)) || Number(draft.mrp) < 0) {
        toast.error(`Check required fields and MRP for ${product.partCode || product.code || 'this product'}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(changed.map((product) => api.updateProduct(token, product._id, { ...bulkDrafts[product._id], name: bulkDrafts[product._id].description })));
      const updated = results.filter((result) => result.status === 'fulfilled').map((result) => result.value.product);
      if (updated.length) {
        const byId = new Map(updated.map((product) => [String(product._id), product]));
        setProducts((current) => current.map((product) => byId.get(String(product._id)) || product));
        setBulkOriginals((current) => ({ ...current, ...Object.fromEntries(updated.map((product) => [product._id, productDraft(product)])) }));
        setBulkDrafts((current) => ({ ...current, ...Object.fromEntries(updated.map((product) => [product._id, productDraft(product)])) }));
      }
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length) {
        const firstFailure = results.findIndex((result) => result.status === 'rejected');
        toast.error(`${failed.length} product${failed.length === 1 ? '' : 's'} could not be saved. ${changed[firstFailure].partCode || changed[firstFailure].code}: ${results[firstFailure].reason.message}`);
      } else {
        cancelBulkEdit();
        toast.success(`${updated.length} product${updated.length === 1 ? '' : 's'} updated successfully.`);
      }
    } finally { setSaving(false); }
  }
  function bulkInput(product, key, props = {}) {
    return <input className="product-bulk-input" aria-label={`${key} for ${product.partCode || product.code}`} {...props} value={bulkDrafts[product._id]?.[key] ?? ''} onChange={(event) => updateBulkDraft(product._id, { [key]: key === 'partCode' ? event.target.value.toUpperCase() : event.target.value })} />;
  }
  function bulkSelect(product, key, options, placeholder, extra = {}) {
    return <ProductSelect value={bulkDrafts[product._id]?.[key]} options={options} placeholder={placeholder} disabled={extra.disabled} onChange={(value) => updateBulkDraft(product._id, { [key]: value, ...(key === 'category' ? { subCategory: '', subSubCategory: '' } : key === 'subCategory' ? { subSubCategory: '' } : {}) })} />;
  }
  function downloadProductsCsv(items, filename) {
    const url = URL.createObjectURL(new Blob([exportProductsCsv(items)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function loadAllProducts() {
    const allProducts = [];
    let exportPage = 1;
    let totalPages = 1;
    do {
      const response = await api.products(token, { page: exportPage, limit: 1000 });
      allProducts.push(...(response.products || []));
      totalPages = response.pagination?.totalPages || 1;
      exportPage += 1;
    } while (exportPage <= totalPages);
    return allProducts;
  }
  async function exportProducts() {
    setExporting(true);
    try {
      const allProducts = await loadAllProducts();
      downloadProductsCsv(allProducts, 'products-export.csv');
      toast.success(`${allProducts.length} product${allProducts.length === 1 ? '' : 's'} exported.`);
    } catch (error) { toast.error(error.message); } finally { setExporting(false); }
  }
  async function selectImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { toast.error('Choose a CSV file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('CSV file must be 5 MB or smaller.'); return; }
    try {
      const preview = importProductsCsv(await file.text());
      setImportPreview({ ...preview, fileName: file.name, result: null });
    } catch (error) { toast.error(error.message); }
  }
  async function submitImport() {
    if (!importPreview?.products.length || importPreview.errors.length) return;
    setImporting(true);
    const failures = [];
    let created = 0;
    let updated = 0;
    try {
      const existing = new Map((await loadAllProducts()).map((product) => [String(product.partCode || product.code || '').toUpperCase(), product]));
      for (let offset = 0; offset < importPreview.products.length; offset += 5) {
        const batch = importPreview.products.slice(offset, offset + 5);
        const results = await Promise.allSettled(batch.map((product) => {
          const match = existing.get(product.partCode);
          if (!match) return api.createProduct(token, product);
          const payload = { ...product, name: product.description };
          if (!payload.image) delete payload.image;
          return api.updateProduct(token, match._id, payload);
        }));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (existing.has(batch[index].partCode)) updated += 1;
            else created += 1;
          }
          else failures.push(`Row ${batch[index].rowNumber} (${batch[index].partCode}): ${result.reason.message}`);
        });
      }
      setImportPreview((current) => ({ ...current, result: { created, updated, failures } }));
      if (created || updated) {
        setStatus('all'); setSearch(''); setPage(1);
        const response = await api.products(token, { page: 1, limit: 10 });
        setProducts(response.products || []);
        setPagination(response.pagination || { page: 1, total: response.products?.length || 0, totalPages: 1 });
      }
      if (failures.length) toast.error(`${created} created, ${updated} updated; ${failures.length} failed. See the import results.`);
      else toast.success(`${created} created and ${updated} updated successfully.`);
    } catch (error) { toast.error(error.message); } finally { setImporting(false); }
  }
  function handleFileAction({ key }) {
    if (key === 'import') importInput.current?.click();
    else if (key === 'export') exportProducts();
    else if (key === 'template') downloadProductsCsv([], 'products-blank-template.csv');
  }
  const fileMenu = {
    items: [
      { key: 'import', icon: <Upload size={16} />, label: 'Import CSV' },
      { key: 'export', icon: <Download size={16} />, label: 'Export products' },
      { key: 'template', icon: <FileDown size={16} />, label: 'Blank template (column names only)' },
    ],
    onClick: handleFileAction,
  };
  function openCreate() { setForm({ ...emptyProduct }); setImageFile(null); setDialog({ mode: 'create' }); }
  function openEdit(product) { setForm({ ...productDraft(product), image: product.image || '', isActive: product.isActive !== false }); setImageFile(null); setDialog({ mode: 'edit', product }); }
  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be 5 MB or smaller.'); event.target.value = ''; return; }
    setImageFile(file);
  }
  async function submitProduct(event) {
    event.preventDefault();
    if (!form.partCode.trim() || !form.description.trim() || !form.category.trim() || (form.dollarAmount === '' && form.mrp === '')) { toast.error('Part code, description, category, and a price are required.'); return; }
    setSaving(true);
    try {
      const mode = dialog.mode;
      const payload = new FormData();
      Object.entries({ ...form, mrp: calculatedRate }).forEach(([key, value]) => { if (value !== undefined && value !== null) payload.append(key, String(value)); });
      if (imageFile) payload.set('image', imageFile);
      const result = mode === 'create' ? await api.createProduct(token, payload) : await api.updateProduct(token, dialog.product._id, payload);
      setProducts((current) => mode === 'create' ? [result.product, ...current.filter((product) => String(product._id) !== String(result.product._id))] : current.map((product) => String(product._id) === String(result.product._id) ? result.product : product));
      setStatus('all'); setSearch(''); setPage(1); setImageFile(null); setDialog(null); toast.success(mode === 'create' ? 'Product added successfully.' : 'Product updated successfully.');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  async function deleteProduct() { setSaving(true); try { await api.deleteProduct(token, dialog.product._id); setProducts((current) => current.filter((product) => product._id !== dialog.product._id)); setDialog(null); toast.success('Product deleted successfully.'); } catch (error) { toast.error(error.message); } finally { setSaving(false); } }
  const calculatedRate = Number.isFinite(Number(form.dollarAmount)) && Number.isFinite(Number(form.marginPercent)) && Number.isFinite(Number(pricingSettings.dollarRate)) && Number.isFinite(Number(pricingSettings.multiplier)) ? (Number(form.dollarAmount) * Number(pricingSettings.dollarRate) * (1 + Number(form.marginPercent) / 100) * Number(pricingSettings.multiplier)).toFixed(2) : '0.00';
  const field = (key, label, props = {}) => <>{<label>{label}<input {...props} disabled={key === 'mrp'} readOnly={key === 'mrp'} value={key === 'mrp' ? calculatedRate : form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>}{key === 'description' && <><label>Dollar amount (USD) *<input required min="0" step="any" inputMode="decimal" type="number" value={form.dollarAmount} onChange={(event) => setForm({ ...form, dollarAmount: event.target.value })} placeholder="0.00" /></label><label>Margin percentage *<input required min="0" step="any" inputMode="decimal" type="number" value={form.marginPercent} onChange={(event) => setForm({ ...form, marginPercent: event.target.value })} placeholder="0" /></label></>}</>;
  return <div className="crm-content-inner product-master-page">
    <div className="section-heading"><div><h1>Products</h1><p>Maintain the product catalogue used across the CRM.</p></div><div className="product-heading-actions"><input ref={importInput} type="file" accept=".csv,text/csv" className="product-import-input" aria-label="Choose product CSV file" onChange={selectImportFile} />{bulkEditing ? <><button className="secondary-action" type="button" disabled={saving} onClick={cancelBulkEdit}>Cancel</button><button className="primary-action" type="button" disabled={saving} onClick={saveBulkEdit}><Save size={17} />{saving ? 'Saving…' : 'Save changes'}</button></> : <><Dropdown menu={fileMenu} trigger={['click']} placement="bottomRight" overlayClassName="product-file-menu"><button className="secondary-action product-files-button" type="button" disabled={importing || exporting}><FileDown size={17} />Import / export<ChevronDown size={15} /></button></Dropdown><button className="secondary-action" type="button" disabled={!filteredProducts.length} onClick={startBulkEdit}><Edit3 size={17} />Bulk edit</button><button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Add product</button></>}</div></div>
    <div className="product-toolbar"><div className="user-tabs product-status-tabs"><button className={status === 'all' ? 'active' : ''} type="button" disabled={bulkEditing} onClick={() => { setStatus('all'); setPage(1); }}>All products</button><button className={status === 'active' ? 'active' : ''} type="button" disabled={bulkEditing} onClick={() => { setStatus('active'); setPage(1); }}>Active</button><button className={status === 'inactive' ? 'active' : ''} type="button" disabled={bulkEditing} onClick={() => { setStatus('inactive'); setPage(1); }}>Inactive</button></div><label className="user-search"><Search size={16} /><input value={search} disabled={bulkEditing} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search part code, description, brand" /></label></div>
    {bulkEditing && <p className="product-bulk-hint">Editing {displayedProducts.length} product{displayedProducts.length === 1 ? '' : 's'} on this page. Save changes before changing pages or filters.</p>}
    <div className="product-table-wrap"><table className={`product-table${bulkEditing ? ' bulk-editing' : ''}`}><thead><tr><th>Image</th><th>Part Code</th><th>Description</th><th>Brand</th><th>Category</th><th>Sub category</th><th>Sub-sub category</th><th>HSN Code</th><th>GST</th><th>Final rate</th>{!bulkEditing && <th className="actions-heading">Actions</th>}</tr></thead><tbody>{displayedProducts.length ? displayedProducts.map((product) => {
      const draft = bulkDrafts[product._id];
      const rowCategory = categories.find((category) => category.name === draft?.category);
      const rowCategories = categories.map((category) => ({ value: category.name, label: category.name }));
      if (draft?.category && !rowCategories.some((option) => option.value === draft.category)) rowCategories.push({ value: draft.category, label: `${draft.category} (legacy)` });
      const rowSubCategories = (rowCategory?.subCategories || []).map((item) => ({ value: item.name, label: item.name }));
      if (draft?.subCategory && !rowSubCategories.some((option) => option.value === draft.subCategory)) rowSubCategories.push({ value: draft.subCategory, label: `${draft.subCategory} (legacy)` });
      const rowSubCategory = rowCategory?.subCategories?.find((item) => item.name === draft?.subCategory);
      const rowSubSubCategories = (rowSubCategory?.subSubCategories || []).map((item) => ({ value: item.name, label: item.name }));
      if (draft?.subSubCategory && !rowSubSubCategories.some((option) => option.value === draft.subSubCategory)) rowSubSubCategories.push({ value: draft.subSubCategory, label: `${draft.subSubCategory} (legacy)` });
      return <tr key={product._id}><td><button className={`product-table-image${product.image ? ' clickable' : ''}`} type="button" disabled={!product.image} title={product.image ? 'Preview image' : 'No image uploaded'} onClick={() => product.image && setDialog({ mode: 'preview', product })}>{product.image ? <img src={productImageUrl(product.image)} alt={product.description || product.name || 'Product'} /> : <Package size={17} />}</button></td><td>{bulkEditing ? bulkInput(product, 'partCode', { maxLength: 40, required: true }) : <span className="product-code">{product.partCode || product.code || '—'}</span>}</td><td>{bulkEditing ? bulkInput(product, 'description', { maxLength: 1000, required: true }) : <div className="product-name-cell"><div><strong>{product.description || product.name || '—'}</strong></div></div>}</td><td>{bulkEditing ? bulkInput(product, 'brand', { maxLength: 80 }) : product.brand || '—'}</td><td>{bulkEditing ? bulkSelect(product, 'category', rowCategories, 'Category') : product.category || '—'}</td><td>{bulkEditing ? bulkSelect(product, 'subCategory', rowSubCategories, 'Sub category', { disabled: !draft?.category }) : product.subCategory || '—'}</td><td>{bulkEditing ? bulkSelect(product, 'subSubCategory', rowSubSubCategories, 'Sub-sub category', { disabled: !draft?.subCategory }) : product.subSubCategory || '—'}</td><td>{bulkEditing ? bulkInput(product, 'hsnCode', { maxLength: 20 }) : product.hsnCode || '—'}</td><td>{bulkEditing ? bulkSelect(product, 'taxRate', taxOptions, 'GST') : `${product.taxRate ?? 0}%`}</td><td>{bulkEditing ? bulkInput(product, 'mrp', { type: 'number', min: '0', step: '0.01', required: true }) : <strong className="selling-price">{currency.format(Number(product.mrp ?? product.salePrice ?? 0))}</strong>}</td>{!bulkEditing && <td><div className="table-actions"><button className="icon-action edit" type="button" title="Edit product" aria-label="Edit product" onClick={() => openEdit(product)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete product" aria-label="Delete product" onClick={() => setDialog({ mode: 'delete', product })}><Trash2 size={16} /></button></div></td>}</tr>;
    }) : <tr><td className="empty-table" colSpan={bulkEditing ? 10 : 11}>No products match your filters.</td></tr>}</tbody></table></div>
    <div className="lead-pagination"><span>{pagination.total || 0} product{pagination.total === 1 ? '' : 's'}</span><div><button type="button" disabled={bulkEditing || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><strong>Page {page} of {pagination.totalPages || 1}</strong><button type="button" disabled={bulkEditing || page >= (pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    {importPreview && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !importing && setImportPreview(null)}><div className="confirm-modal product-import-modal" role="dialog" aria-modal="true" aria-labelledby="product-import-title"><div className="modal-heading"><div><span className="dashboard-kicker">Product catalogue</span><h2 id="product-import-title">Import products</h2></div><button className="modal-close" type="button" disabled={importing} aria-label="Close import preview" onClick={() => setImportPreview(null)}><X size={18} /></button></div><p><strong>{importPreview.fileName}</strong></p>{importPreview.result ? <><p>{importPreview.result.created} created, {importPreview.result.updated} updated; {importPreview.result.failures.length} failed.</p>{importPreview.result.failures.length > 0 && <ul className="product-import-errors">{importPreview.result.failures.map((error) => <li key={error}>{error}</li>)}</ul>}</> : <><p>{importPreview.products.length} valid product{importPreview.products.length === 1 ? '' : 's'} ready to import. Existing Part Codes will be updated; new Part Codes will be created. Part Code, Description, Category, and MRP are required. GST Rate defaults to 18 and Active defaults to Yes when blank.</p>{importPreview.errors.length > 0 && <ul className="product-import-errors">{importPreview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}{!importPreview.products.length && !importPreview.errors.length && <p>This file has only headers. Add product rows before importing.</p>}</>}<div className="modal-footer"><button className="secondary-action" type="button" disabled={importing} onClick={() => setImportPreview(null)}>{importPreview.result ? 'Close' : 'Cancel'}</button>{!importPreview.result && <button className="primary-action" type="button" disabled={importing || !!importPreview.errors.length || !importPreview.products.length} onClick={submitImport}>{importing ? 'Importing…' : `Import ${importPreview.products.length} products`}</button>}</div></div></div>}
    {dialog && ['create', 'edit'].includes(dialog.mode) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><form className="user-modal product-modal" onSubmit={submitProduct}><div className="modal-heading"><div><span className="dashboard-kicker">Product catalogue</span><h2>{dialog.mode === 'create' ? 'Add a new product' : 'Edit product details'}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div><div className="product-image-upload"><div className="product-image-preview">{imagePreview ? <img src={imagePreview} alt="Product preview" /> : <Package size={28} />}</div><label className="secondary-action product-image-button"><Plus size={15} />{imageFile ? 'Change image' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage} /></label><small>PNG, JPG, WEBP or GIF · maximum 5 MB</small></div><div className="modal-fields product-fields">
      <label>Part Code *<input required maxLength="40" value={form.partCode} onChange={(event) => setForm({ ...form, partCode: event.target.value.toUpperCase() })} placeholder="Example: JB-001" /></label>
      {field('description', 'Desc *', { required: true, maxLength: 1000, placeholder: 'Enter product description' })}{field('hsnCode', 'HSN Code', { maxLength: 20, placeholder: 'Enter HSN code' })}{field('brand', 'Brand', { maxLength: 80, placeholder: 'Enter brand' })}<label>Category *<ProductSelect value={form.category} options={categoryOptions} placeholder="Select category" onChange={(category) => setForm({ ...form, category, subCategory: '', subSubCategory: '' })} /></label><label>Sub category<ProductSelect value={form.subCategory} options={subCategoryOptions} placeholder={form.category ? 'Select sub category' : 'Select category first'} disabled={!form.category} onChange={(subCategory) => setForm({ ...form, subCategory, subSubCategory: '' })} /></label><label>Sub-sub category<ProductSelect value={form.subSubCategory} options={subSubCategoryOptions} placeholder={form.subCategory ? 'Select sub-sub category' : 'Select sub category first'} disabled={!form.subCategory} onChange={(subSubCategory) => setForm({ ...form, subSubCategory })} /></label><label>GST *<ProductSelect value={form.taxRate} options={taxOptions} onChange={(taxRate) => setForm({ ...form, taxRate })} /></label>{field('mrp', 'MRP (₹) *', { required: true, min: '0', step: '0.01', type: 'number', placeholder: '0.00' })}
    </div><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : dialog.mode === 'create' ? 'Create product' : 'Save changes'}</button></div></form></div>}
    {dialog?.mode === 'preview' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><div className="confirm-modal product-preview-modal"><div className="modal-heading"><div><span className="dashboard-kicker">Product image</span><h2>{dialog.product.description || dialog.product.name || 'Product preview'}</h2></div><button className="modal-close" type="button" aria-label="Close image preview" onClick={() => setDialog(null)}><X size={18} /></button></div><img className="product-large-preview" src={productImageUrl(dialog.product.image)} alt={dialog.product.description || dialog.product.name || 'Product'} /></div></div>}
    {dialog?.mode === 'delete' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this product?</h2><p>This will permanently remove <strong>{dialog.product.description || dialog.product.name}</strong> from Product Master.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" disabled={saving} type="button" onClick={deleteProduct}>{saving ? 'Deleting…' : 'Delete product'}</button></div></div></div>}
  </div>;
}

export default ProductMasterPanel;
