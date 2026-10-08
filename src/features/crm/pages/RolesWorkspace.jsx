import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';
import { PERMISSION_MODULES } from '../../../utils/permissions.js';

const emptyForm = { name: '', description: '', isActive: true, permissions: [] };

function RolesWorkspace({ token }) {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState(PERMISSION_MODULES);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const permissionCount = useMemo(() => modules.reduce((total, module) => total + module.actions.length, 0), [modules]);

  useEffect(() => {
    api.roles(token).then((result) => { setRoles(result.roles || []); setModules(result.modules || PERMISSION_MODULES); }).catch((error) => toast.error(error.message));
  }, [token]);

  function openCreate() { setForm({ ...emptyForm, permissions: [] }); setDialog({ mode: 'create' }); }
  function openEdit(role) {
    setForm({ name: role.name, description: role.description || '', isActive: role.isActive !== false, permissions: [...(role.permissions || [])] });
    setDialog({ mode: 'edit', role });
  }
  function toggle(permission) {
    setForm((current) => {
      const [moduleKey, action] = permission.split('.');
      if (current.permissions.includes(permission)) {
        return { ...current, permissions: action === 'view' ? current.permissions.filter((item) => !item.startsWith(`${moduleKey}.`)) : current.permissions.filter((item) => item !== permission) };
      }
      return { ...current, permissions: [...new Set([...current.permissions, permission, `${moduleKey}.view`])] };
    });
  }
  function toggleModule(module) {
    const keys = module.actions.map((action) => `${module.key}.${action}`);
    const allSelected = keys.every((key) => form.permissions.includes(key));
    setForm((current) => ({ ...current, permissions: allSelected ? current.permissions.filter((key) => !keys.includes(key)) : [...new Set([...current.permissions, ...keys])] }));
  }
  async function submit(event) {
    event.preventDefault();
    try {
      const result = dialog.mode === 'create' ? await api.createRole(token, form) : await api.updateRole(token, dialog.role._id, form);
      setRoles((current) => dialog.mode === 'create' ? [...current.filter((role) => role.isSystem), result.role, ...current.filter((role) => !role.isSystem)] : current.map((role) => role._id === result.role._id ? result.role : role));
      setDialog(null);
      toast.success(dialog.mode === 'create' ? 'Role created successfully.' : 'Permissions updated successfully. Changes apply on the user’s next request.');
    } catch (error) { toast.error(error.message); }
  }
  async function removeRole() {
    try {
      await api.deleteRole(token, dialog.role._id);
      setRoles((current) => current.filter((role) => role._id !== dialog.role._id));
      setDialog(null);
      toast.success('Role deleted successfully.');
    } catch (error) { toast.error(error.message); }
  }

  return <div className="crm-content-inner role-management-page">
    <div className="section-heading">
      <div><h1>Roles &amp; Permissions</h1><p>Control exactly which menus and actions each role can access.</p></div>
      <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Create role</button>
    </div>
    <div className="role-security-note"><ShieldCheck size={20} /><div><strong>Administrator-only control</strong><span>Permissions are enforced by both the menu and the API. Administrator accounts always retain full access.</span></div></div>
    <div className="role-card-grid">
      {roles.length ? roles.map((role) => <article className="role-card clickable" key={role._id} role="button" tabIndex="0" aria-label={`View all permissions for ${role.name}`} onClick={() => setDialog({ mode: 'view', role })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDialog({ mode: 'view', role }); } }}>
        <div className="role-card-heading"><div className="role-card-icon"><ShieldCheck size={20} /></div><span className={`role-state ${role.isActive ? 'active' : 'inactive'}`}>{role.isSystem ? 'Built-in' : role.isActive ? 'Active' : 'Inactive'}</span></div>
        <h2>{role.name}</h2><p>{role.description || 'No description provided.'}</p>
        <div className="role-card-stats"><span><strong>{role.permissions?.length || 0}</strong> of {permissionCount} permissions</span><span><strong>{role.userCount || 0}</strong> users</span></div>
        <div className="role-card-actions" onClick={(event) => event.stopPropagation()}>{role.isSystem ? <button type="button" disabled title="Built-in administrator permissions cannot be changed"><ShieldCheck size={15} />Full access protected</button> : <><button type="button" onClick={() => openEdit(role)}><Edit3 size={15} />Edit permissions</button><button className="danger" type="button" disabled={role.userCount > 0} title={role.userCount ? 'Reassign users before deleting this role' : 'Delete role'} onClick={() => setDialog({ mode: 'delete', role })}><Trash2 size={15} /></button></>}</div>
      </article>) : <div className="empty-role-state"><ShieldCheck size={30} /><h2>No custom roles yet</h2><p>Create the first role and choose its menu permissions.</p></div>}
    </div>
    {dialog?.mode === 'view' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
      <div className="role-modal role-permission-view" role="dialog" aria-modal="true" aria-labelledby="permission-view-title">
        <div className="modal-heading"><div><span className="dashboard-kicker">Permission details</span><h2 id="permission-view-title">{dialog.role.name}</h2><p>{dialog.role.description || 'No description provided.'}</p></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div>
        <div className="permission-view-summary"><ShieldCheck size={19} /><span><strong>{dialog.role.permissions?.length || 0}</strong> permissions enabled across {modules.filter((module) => dialog.role.permissions?.includes(`${module.key}.menu`)).length} visible menus</span></div>
        <div className="permission-table-wrap"><table className="permission-table permission-view-table"><thead><tr><th>Module</th><th title="Show in sidebar">Sidebar</th><th title="View own data">Own</th><th title="View all users’ data">All users</th><th>Create</th><th>Edit</th><th>Delete</th></tr></thead><tbody>{modules.map((module) => <tr key={module.key}><th>{module.label}</th>{['menu', 'view', 'viewAll', 'create', 'edit', 'delete'].map((action) => { const available = module.actions.includes(action); const granted = dialog.role.permissions?.includes(`${module.key}.${action}`); return <td key={action}>{available ? <span className={`permission-result ${granted ? 'granted' : 'denied'}`}>{granted ? <><Check size={13} />Yes</> : 'No'}</span> : <span className="permission-na">—</span>}</td>; })}</tr>)}</tbody></table></div>
        <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Close</button>{!dialog.role.isSystem && <button className="primary-action" type="button" onClick={() => openEdit(dialog.role)}><Edit3 size={15} />Edit permissions</button>}</div>
      </div>
    </div>}
    {dialog && !['delete', 'view'].includes(dialog.mode) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
      <form className="role-modal" onSubmit={submit}>
        <div className="modal-heading"><h2>{dialog.mode === 'create' ? 'Create role' : `Edit ${dialog.role.name}`}</h2><button className="modal-close" type="button" aria-label="Close" onClick={() => setDialog(null)}><X size={18} /></button></div>
        <div className="role-form-fields"><label>Name<input required maxLength="60" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Sales Executive" /></label><label><span>Description <span className="optional-label">Optional</span></span><input maxLength="240" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Main responsibility" /></label><label className="role-active-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span><Check size={14} /></span>Active</label></div>
        <div className="permission-heading"><h3>Permissions</h3><button type="button" onClick={() => setForm((current) => ({ ...current, permissions: current.permissions.length === permissionCount ? [] : modules.flatMap((module) => module.actions.map((action) => `${module.key}.${action}`)) }))}>{form.permissions.length === permissionCount ? 'Clear all' : 'Select all'}</button></div>
        <div className="permission-table-wrap"><table className="permission-table"><thead><tr><th>Module</th><th title="Show in sidebar">Sidebar</th><th title="View own data">Own</th><th title="View all users’ data">All users</th><th>Create</th><th>Edit</th><th>Delete</th><th><span className="loading-sr-only">Row actions</span></th></tr></thead><tbody>{modules.map((module) => <tr key={module.key}><th>{module.label}</th>{['menu', 'view', 'viewAll', 'create', 'edit', 'delete'].map((action) => { const available = module.actions.includes(action); const permission = `${module.key}.${action}`; return <td key={action}>{available ? <label className="permission-check"><input type="checkbox" aria-label={`${module.label}: ${action}`} checked={form.permissions.includes(permission)} onChange={() => toggle(permission)} /><span><Check size={13} /></span></label> : <span className="permission-na">—</span>}</td>; })}<td><button className="module-toggle" type="button" aria-label={`${module.actions.every((action) => form.permissions.includes(`${module.key}.${action}`)) ? 'Clear' : 'Select'} all ${module.label} permissions`} onClick={() => toggleModule(module)}>{module.actions.every((action) => form.permissions.includes(`${module.key}.${action}`)) ? 'Clear' : 'All'}</button></td></tr>)}</tbody></table></div>
        <div className="modal-footer"><span className="permission-selected">{form.permissions.length} selected</span><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" type="submit">{dialog.mode === 'create' ? 'Create role' : 'Save changes'}</button></div>
      </form>
    </div>}
    {dialog?.mode === 'delete' && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><div className="confirm-modal"><div className="confirm-icon"><Trash2 size={20} /></div><h2>Delete {dialog.role.name}?</h2><p>This permanently removes the role. It can only be deleted when no users are assigned.</p><div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={removeRole}>Delete role</button></div></div></div>}
  </div>;
}

export default RolesWorkspace;
