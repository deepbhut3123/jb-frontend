import { Archive, Atom, Award, Badge, Banknote, Battery, Bike, BookOpen, Boxes, BriefcaseBusiness, Building2, Car, ChefHat, ChevronDown, Coffee, Cpu, Crown, Dumbbell, Edit3, Factory, Flower2, Folder, FolderTree, Gamepad2, Gem, Globe2, Hammer, HeartPulse, House, Laptop, Leaf, Layers3, Lightbulb, MapPin, Megaphone, Monitor, Package, Palette, PawPrint, Pill, Plane, Plus, Rocket, Search, Shirt, ShoppingBag, Smartphone, Sofa, Tag, Trash2, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api.js';

const categoryIcons = [Folder, Boxes, Tag, Layers3, FolderTree, Archive, Atom, Award, Badge, Banknote, Battery, Bike, BookOpen, BriefcaseBusiness, Building2, Car, ChefHat, Coffee, Cpu, Crown, Dumbbell, Factory, Flower2, Gamepad2, Gem, Globe2, Hammer, HeartPulse, House, Laptop, Leaf, Lightbulb, MapPin, Megaphone, Monitor, Package, Palette, PawPrint, Pill, Plane, Rocket, Shirt, ShoppingBag, Smartphone, Sofa, Wrench];
function categoryIconIndex(category) { return [...String(category._id || category.name)].reduce((total, character) => total + character.charCodeAt(0), 0) % categoryIcons.length; }

function CategoryMasterPanel({ categories, setCategories, token }) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryDialog, setSubCategoryDialog] = useState(null);
  const [subCategoryNames, setSubCategoryNames] = useState(['']);
  const [saving, setSaving] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set(categories.map((category) => category._id)));
  useEffect(() => {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      categories.forEach((category) => { if (!current.has(category._id)) next.add(category._id); });
      return next;
    });
  }, [categories]);
  const visibleCategories = useMemo(() => categories.filter((category) => {
    const query = search.trim().toLowerCase();
    return !query || category.name.toLowerCase().includes(query) || category.subCategories.some((item) => item.name.toLowerCase().includes(query));
  }), [categories, search]);
  const subCategoryCount = categories.reduce((total, category) => total + category.subCategories.length, 0);

  function openCategory(mode, category = null) { setCategoryName(category?.name || ''); setDialog({ mode, category }); }
  function openSubCategoryDialog(category) { setSubCategoryNames(['']); setSubCategoryDialog(category); }
  function updateCategoryState(updated) { setCategories((current) => current.map((category) => category._id === updated._id ? updated : category)); }
  function toggleCategory(categoryId) { setCollapsedCategories((current) => { const next = new Set(current); if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId); return next; }); }
  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) { toast.error('Category name is required.'); return; }
    setSaving(true);
    try {
      const result = dialog.mode === 'create' ? await api.createCategory(token, { name: categoryName }) : await api.updateCategory(token, dialog.category._id, { name: categoryName });
      setCategories((current) => dialog.mode === 'create' ? [...current, result.category].sort((a, b) => a.name.localeCompare(b.name)) : current.map((category) => category._id === result.category._id ? result.category : category));
      setDialog(null); setCategoryName(''); toast.success(dialog.mode === 'create' ? 'Category added successfully.' : 'Category updated successfully.');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  async function removeCategory(category) {
    setDeleteDialog({ type: 'category', category });
  }
  async function saveSubCategories(event) {
    event.preventDefault();
    const names = subCategoryNames.map((name) => name.trim()).filter(Boolean);
    if (!names.length) { toast.error('Add at least one sub category.'); return; }
    setSaving(true);
    try {
      let updatedCategory = subCategoryDialog;
      for (const name of names) { const result = await api.createSubCategory(token, subCategoryDialog._id, { name }); updatedCategory = result.category; }
      updateCategoryState(updatedCategory); setSubCategoryDialog(null); setSubCategoryNames(['']); toast.success(`${names.length} sub categor${names.length === 1 ? 'y' : 'ies'} added successfully.`);
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  async function editSubCategory(category, subCategory) {
    const name = window.prompt('Enter sub category name:', subCategory.name);
    if (name === null || !name.trim()) return;
    try { const result = await api.updateSubCategory(token, category._id, subCategory._id, { name }); updateCategoryState(result.category); toast.success('Sub category updated successfully.'); } catch (error) { toast.error(error.message); }
  }
  async function removeSubCategory(category, subCategory) {
    setDeleteDialog({ type: 'subCategory', category, subCategory });
  }
  async function confirmDelete() {
    setSaving(true);
    try {
      if (deleteDialog.type === 'category') {
        await api.deleteCategory(token, deleteDialog.category._id);
        setCategories((current) => current.filter((item) => item._id !== deleteDialog.category._id));
        toast.success('Category deleted successfully.');
      } else {
        const result = await api.deleteSubCategory(token, deleteDialog.category._id, deleteDialog.subCategory._id);
        updateCategoryState(result.category);
        toast.success('Sub category deleted successfully.');
      }
      setDeleteDialog(null);
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }

  return <div className="crm-content-inner category-master-page">
    <div className="section-heading"><div><h1>Categories</h1><p>Organise products with a clear category and sub-category structure.</p></div><div className="category-heading-actions"><label className="user-search category-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories and sub categories" /></label><button className="primary-action" type="button" onClick={() => openCategory('create')}><Plus size={17} />Add category</button></div></div>
    <div className="category-summary"><div><strong>{categories.length}</strong><span>Parent categories</span></div><div><strong>{subCategoryCount}</strong><span>Sub categories</span></div><div><strong>{categories.length ? Math.round(subCategoryCount / categories.length * 10) / 10 : 0}</strong><span>Average per category</span></div></div>
    <div className="category-master-list">{visibleCategories.length ? visibleCategories.map((category) => { const isCollapsed = collapsedCategories.has(category._id); const iconIndex = categoryIconIndex(category); const CategoryIcon = categoryIcons[iconIndex]; return <section className={`category-master-card${isCollapsed ? ' collapsed' : ''}`} key={category._id}><div className="category-master-heading"><button className="category-master-toggle" type="button" aria-expanded={!isCollapsed} onClick={() => toggleCategory(category._id)}><ChevronDown className="category-expand-icon" size={17} /><span className={`category-master-icon category-icon-${iconIndex % 10}`}><CategoryIcon size={17} /></span><div className="category-master-title"><small>Parent category</small><strong>{category.name}</strong><span>{category.subCategories.length} sub categor{category.subCategories.length === 1 ? 'y' : 'ies'}</span></div></button><div className="table-actions"><button className="secondary-action category-add-sub-action" type="button" title="Add sub categories" onClick={() => openSubCategoryDialog(category)}><Plus size={14} />Add sub category</button><button className="icon-action edit" type="button" title="Edit category" aria-label={`Edit ${category.name}`} onClick={() => openCategory('edit', category)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete category" aria-label={`Delete ${category.name}`} onClick={() => removeCategory(category)}><Trash2 size={16} /></button></div></div>{!isCollapsed && <div className="sub-category-section"><div className="sub-category-section-heading"><strong>Sub categories</strong><span>Products in this category can be grouped here</span></div>{category.subCategories.length ? <div className="sub-category-list">{category.subCategories.map((subCategory) => <div className="sub-category-row" key={subCategory._id}><span>{subCategory.name}</span><div className="table-actions"><button className="icon-action edit" type="button" title="Edit sub category" aria-label={`Edit ${subCategory.name}`} onClick={() => editSubCategory(category, subCategory)}><Edit3 size={15} /></button><button className="icon-action delete" type="button" title="Delete sub category" aria-label={`Delete ${subCategory.name}`} onClick={() => removeSubCategory(category, subCategory)}><Trash2 size={15} /></button></div></div>)}</div> : <div className="sub-category-empty">No sub categories added yet. Use “Add sub category” above to add them.</div>}</div>}</section>; }) : <div className="empty-state-card"><FolderTree size={24} /><strong>No categories found</strong><span>Add a category to start building the product catalogue.</span></div>}</div>
    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><form className="user-modal category-modal" onSubmit={saveCategory}><div className="modal-heading"><div><span className="dashboard-kicker">Product catalogue</span><h2>{dialog.mode === 'create' ? 'Add category' : 'Edit category'}</h2><p>{dialog.mode === 'create' ? 'Create a parent category for your products.' : 'Update the parent category name.'}</p></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div><label>Category name *<input autoFocus required maxLength="80" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Enter category name" /></label><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : dialog.mode === 'create' ? 'Add category' : 'Save changes'}</button></div></form></div>}
    {subCategoryDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSubCategoryDialog(null)}><form className="user-modal category-modal bulk-subcategory-modal" onSubmit={saveSubCategories}><div className="modal-heading"><div><span className="dashboard-kicker">{subCategoryDialog.name}</span><h2>Add sub categories</h2><p>Add one or more sub categories under this parent category.</p></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setSubCategoryDialog(null)}><X size={18} /></button></div><div className="bulk-subcategory-fields">{subCategoryNames.map((name, index) => <div className="bulk-subcategory-row" key={`subcategory-${index}`}><span>{index + 1}</span><input autoFocus={index === 0} value={name} onChange={(event) => setSubCategoryNames((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Sub category ${index + 1}`} />{subCategoryNames.length > 1 && <button className="icon-action delete" type="button" title="Remove field" aria-label={`Remove sub category ${index + 1}`} onClick={() => setSubCategoryNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>}</div>)}</div><button className="secondary-action bulk-add-more" type="button" onClick={() => setSubCategoryNames((current) => [...current, ''])}><Plus size={15} />Add more</button><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setSubCategoryDialog(null)}>Cancel</button><button className="primary-action" disabled={saving} type="submit">{saving ? 'Saving…' : 'Add sub categories'}</button></div></form></div>}
    {deleteDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteDialog(null)}><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>{deleteDialog.type === 'category' ? 'Delete this category?' : 'Delete this sub category?'}</h2><p>{deleteDialog.type === 'category' ? <>This will permanently remove <strong>{deleteDialog.category.name}</strong> and all of its sub-categories.</> : <>This will permanently remove <strong>{deleteDialog.subCategory.name}</strong> from <strong>{deleteDialog.category.name}</strong>.</>}</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDeleteDialog(null)}>Cancel</button><button className="danger-action" disabled={saving} type="button" onClick={confirmDelete}>{saving ? 'Deleting…' : 'Delete'}</button></div></div></div>}
  </div>;
}

export default CategoryMasterPanel;
