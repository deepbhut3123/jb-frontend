import { Select } from 'antd';
import { Edit3, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { API_URL, api } from '../services/api.js';

const emptyProduct = { partCode: '', description: '', hsnCode: '', brand: '', category: '', subCategory: '', image: '', taxRate: 18, mrp: '', isActive: true };
const taxOptions = [0, 5, 12, 18, 28].map((value) => ({ value, label: `${value}% GST` }));
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
function productImageUrl(image) { return image?.startsWith('http') ? image : `${API_URL}${image}`; }

function ProductSelect({ value, options, onChange, placeholder, disabled = false }) {
  return <Select className="antd-crm-select product-form-select" showSearch optionFilterProp="label" value={value || undefined} options={options} onChange={onChange} placeholder={placeholder} disabled={disabled} />;
}

function ProductMasterPanel({ products, setProducts, categories, token }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!imageFile) { setImagePreview(form.image ? `${API_URL}${form.image}` : ''); return undefined; }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.image, imageFile]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesStatus = status === 'all' || (status === 'active' ? product.isActive !== false : product.isActive === false);
    const query = search.trim().toLowerCase();
    const searchable = [product.partCode, product.code, product.description, product.name, product.brand, product.category, product.subCategory, product.hsnCode].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && (!query || searchable.includes(query));
  }), [products, search, status]);
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
  function openCreate() { setForm({ ...emptyProduct }); setImageFile(null); setDialog({ mode: 'create' }); }
  function openEdit(product) { setForm({ partCode: product.partCode || product.code || '', description: product.description || product.name || '', hsnCode: product.hsnCode || '', brand: product.brand || '', category: product.category || '', subCategory: product.subCategory || '', image: product.image || '', taxRate: product.taxRate ?? 18, mrp: product.mrp ?? product.salePrice ?? '', isActive: product.isActive !== false }); setImageFile(null); setDialog({ mode: 'edit', product }); }
  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); event.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be 5 MB or smaller.'); event.target.value = ''; return; }
    setImageFile(file);
  }
  async function submitProduct(event) {
    event.preventDefault();
    if (!form.partCode.trim() || !form.description.trim() || !form.category.trim() || form.mrp === '') { toast.error('Part code, description, category, and MRP are required.'); return; }
    setSaving(true);
    try {
      const mode = dialog.mode;
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== undefined && value !== null) payload.append(key, String(value)); });
      if (imageFile) payload.set('image', imageFile);
      const result = mode === 'create' ? await api.createProduct(token, payload) : await api.updateProduct(token, dialog.product._id, payload);
      setProducts((current) => mode === 'create' ? [result.product, ...current.filter((product) => String(product._id) !== String(result.product._id))] : current.map((product) => String(product._id) === String(result.product._id) ? result.product : product));
      setStatus('all'); setSearch(''); setImageFile(null); setDialog(null); toast.success(mode === 'create' ? 'Product added successfully.' : 'Product updated successfully.');
      api.products(token).then((response) => setProducts([...(response.products || [])])).catch(() => {});
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  async function deleteProduct() { setSaving(true); try { await api.deleteProduct(token, dialog.product._id); setProducts((current) => current.filter((product) => product._id !== dialog.product._id)); setDialog(null); toast.success('Product deleted successfully.'); } catch (error) { toast.error(error.message); } finally { setSaving(false); } }
  const field = (key, label, props = {}) => <label>{label}<input {...props} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>;
  return <div className="crm-content-inner product-master-page">
    <div className="section-heading"><div><h1>Products</h1><p>Maintain the product catalogue used across the CRM.</p></div><button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Add product</button></div>
    <div className="product-toolbar"><div className="user-tabs product-status-tabs"><button className={status === 'all' ? 'active' : ''} type="button" onClick={() => setStatus('all')}>All products</button><button className={status === 'active' ? 'active' : ''} type="button" onClick={() => setStatus('active')}>Active</button><button className={status === 'inactive' ? 'active' : ''} type="button" onClick={() => setStatus('inactive')}>Inactive</button></div><label className="user-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search part code, description, brand" /></label></div>
    <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Image</th><th>Part Code</th><th>Description</th><th>Brand</th><th>Category</th><th>Sub category</th><th>HSN Code</th><th>GST</th><th>MRP</th><th className="actions-heading">Actions</th></tr></thead><tbody>{filteredProducts.length ? filteredProducts.map((product) => <tr key={product._id}><td><button className={`product-table-image${product.image ? ' clickable' : ''}`} type="button" disabled={!product.image} title={product.image ? 'Preview image' : 'No image uploaded'} onClick={() => product.image && setDialog({ mode: 'preview', product })}>{product.image ? <img src={productImageUrl(product.image)} alt={product.description || product.name || 'Product'} /> : <Package size={17} />}</button></td><td><span className="product-code">{product.partCode || product.code || '—'}</span></td><td><div className="product-name-cell"><div><strong>{product.description || product.name || '—'}</strong></div></div></td><td>{product.brand || '—'}</td><td>{product.category || '—'}</td><td>{product.subCategory || '—'}</td><td>{product.hsnCode || '—'}</td><td>{product.taxRate ?? 0}%</td><td><strong className="selling-price">{currency.format(Number(product.mrp ?? product.salePrice ?? 0))}</strong></td><td><div className="table-actions"><button className="icon-action edit" type="button" title="Edit product" aria-label="Edit product" onClick={() => openEdit(product)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete product" aria-label="Delete product" onClick={() => setDialog({ mode: 'delete', product })}><Trash2 size={16} /></button></div></td></tr>) : <tr><td className="empty-table" colSpan="10">No products match your filters.</td></tr>}</tbody></table></div>
    {dialog && ['create', 'edit'].includes(dialog.mode) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><form className="user-modal product-modal" onSubmit={submitProduct}><div className="modal-heading"><div><span className="dashboard-kicker">Product catalogue</span><h2>{dialog.mode === 'create' ? 'Add a new product' : 'Edit product details'}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div><div className="product-image-upload"><div className="product-image-preview">{imagePreview ? <img src={imagePreview} alt="Product preview" /> : <Package size={28} />}</div><label className="secondary-action product-image-button"><Plus size={15} />{imageFile ? 'Change image' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage} /></label><small>PNG, JPG, WEBP or GIF · maximum 5 MB</small></div><div className="modal-fields product-fields">
      <label>Part Code *<input required maxLength="40" value={form.partCode} onChange={(event) => setForm({ ...form, partCode: event.target.value.toUpperCase() })} placeholder="Example: JB-001" /></label>
      {field('description', 'Desc *', { required: true, maxLength: 1000, placeholder: 'Enter product description' })}{field('hsnCode', 'HSN Code', { maxLength: 20, placeholder: 'Enter HSN code' })}{field('brand', 'Brand', { maxLength: 80, placeholder: 'Enter brand' })}<label>Category *<ProductSelect value={form.category} options={categoryOptions} placeholder="Select category" onChange={(category) => setForm({ ...form, category, subCategory: '' })} /></label><label>Sub category<ProductSelect value={form.subCategory} options={subCategoryOptions} placeholder={form.category ? 'Select sub category' : 'Select category first'} disabled={!form.category} onChange={(subCategory) => setForm({ ...form, subCategory })} /></label><label>GST *<ProductSelect value={form.taxRate} options={taxOptions} onChange={(taxRate) => setForm({ ...form, taxRate })} /></label>{field('mrp', 'MRP (₹) *', { required: true, min: '0', step: '0.01', type: 'number', placeholder: '0.00' })}
    </div><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : dialog.mode === 'create' ? 'Create product' : 'Save changes'}</button></div></form></div>}
    {dialog?.mode === 'preview' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><div className="confirm-modal product-preview-modal"><div className="modal-heading"><div><span className="dashboard-kicker">Product image</span><h2>{dialog.product.description || dialog.product.name || 'Product preview'}</h2></div><button className="modal-close" type="button" aria-label="Close image preview" onClick={() => setDialog(null)}><X size={18} /></button></div><img className="product-large-preview" src={productImageUrl(dialog.product.image)} alt={dialog.product.description || dialog.product.name || 'Product'} /></div></div>}
    {dialog?.mode === 'delete' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete this product?</h2><p>This will permanently remove <strong>{dialog.product.description || dialog.product.name}</strong> from Product Master.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" disabled={saving} type="button" onClick={deleteProduct}>{saving ? 'Deleting…' : 'Delete product'}</button></div></div></div>}
  </div>;
}

export default ProductMasterPanel;
