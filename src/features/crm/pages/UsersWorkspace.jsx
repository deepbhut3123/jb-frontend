import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { toast } from "react-toastify";
import { Edit3, LoaderCircle, Plus, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { api, getSession } from "../../../services/api.js";
import { can, isAdministrator } from "../../../utils/permissions.js";
import { formatDisplayDate } from "../CrmUtils.jsx";

function UsersPanel({ users, setUsers, token }) {
  const currentUser = getSession()?.user;
  const canCreate = can(currentUser, 'users.create');
  const canEdit = can(currentUser, 'users.edit');
  const canDelete = can(currentUser, 'users.delete');
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("lookup") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [searching, setSearching] = useState(false);
  const searchRequestId = useRef(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [dialog, setDialog] = useState(null);
  const [roleOptions, setRoleOptions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: 2,
    roleProfile: "",
  });
  const selectedRole = form.role === 1 ? "system:administrator" : form.roleProfile ? `custom:${form.roleProfile}` : undefined;
  const roleChoices = roleOptions.map((role) => ({
    value: role.isSystem ? "system:administrator" : `custom:${role._id}`,
    label: role.name,
    description: role.isSystem ? "Full access to every menu and permission" : "Role created in Roles & Permissions",
  }));
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesTab =
          tab === "all" ||
          (tab === "users" ? user.role === 2 : user.role !== 2);
        const query = search.trim().toLowerCase();
        return (
          matchesTab &&
          (!query ||
            `${user.name} ${user.email} ${user.phone || ""}`
              .toLowerCase()
              .includes(query))
        );
      }),
    [search, tab, users],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const currentRequest = ++searchRequestId.current;
    setSearching(true);
    api.users(token, { page, limit: 10, role: tab === "all" ? undefined : tab, search: debouncedSearch })
      .then((response) => {
        if (currentRequest !== searchRequestId.current) return;
        setUsers(response.users || []);
        setPagination(response.pagination || { total: response.users?.length || 0, totalPages: 1 });
      })
      .catch((error) => currentRequest === searchRequestId.current && toast.error(error.message))
      .finally(() => { if (currentRequest === searchRequestId.current) setSearching(false); });
  }, [debouncedSearch, page, setUsers, tab, token]);
  useEffect(() => {
    api.roleOptions(token).then((response) => setRoleOptions(response.roles || [])).catch(() => setRoleOptions([]));
  }, [token]);
  function openCreate() {
    setForm({ name: "", email: "", phone: "", password: "", role: 2, roleProfile: "" });
    setDialog({ mode: "create" });
  }
  function openEdit(user) {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role === 2 ? 2 : 1,
      roleProfile: user.roleProfile?.id || "",
    });
    setDialog({ mode: "edit", user });
  }
  async function submitUser(event) {
    event.preventDefault();
    if (!selectedRole) { toast.error("Select a role created in Roles & Permissions."); return; }
    try {
      const result =
        dialog.mode === "create"
          ? await api.createUser(token, form)
          : await api.updateUser(token, dialog.user._id, form);
      setUsers((current) =>
        dialog.mode === "create"
          ? [result.user, ...current]
          : current.map((user) =>
              user._id === result.user._id ? result.user : user,
            ),
      );
      setDialog(null);
      toast.success(
        dialog.mode === "create"
          ? "User added successfully."
          : "User updated successfully.",
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function deleteUser() {
    try {
      await api.deleteUser(token, dialog.user._id);
      setUsers((current) =>
        current.filter((user) => user._id !== dialog.user._id),
      );
      setDialog(null);
      toast.success("User deleted successfully.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  return (
    <div className="crm-content-inner user-management-page">
      <div className="section-heading">
        <div>
          <h1>User Management</h1>
          <p>Manage the people who have access to the JB Corporation CRM.</p>
        </div>
        {canCreate && <button className="primary-action" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add user
        </button>}
      </div>
      <div className="user-toolbar">
        <div className="user-tabs">
          <button
            className={tab === "all" ? "active" : ""}
            type="button"
            onClick={() => { setTab("all"); setPage(1); }}
          >
            All accounts
          </button>
          <button
            className={tab === "users" ? "active" : ""}
            type="button"
            onClick={() => { setTab("users"); setPage(1); }}
          >
            <UserRound size={15} />
            Users
          </button>
          <button
            className={tab === "admins" ? "active" : ""}
            type="button"
            onClick={() => { setTab("admins"); setPage(1); }}
          >
            <ShieldCheck size={15} />
            Admins
          </button>
        </div>
        <label className="user-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search by name or email"
          />
          {searching && <LoaderCircle className="module-search-spinner" size={15} aria-label="Searching" />}
        </label>
      </div>
      <div className="lead-pagination"><span>{pagination.total || 0} account{pagination.total === 1 ? "" : "s"}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><strong>Page {page} of {pagination.totalPages || 1}</strong><button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th className="actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length ? (
              filteredUsers.map((user) => (
                <tr key={user._id} data-record-id={user._id}>
                  <td>
                    <div className="table-user">
                      <span>{user.name.slice(0, 1).toUpperCase()}</span>
                      <strong>{user.name}</strong>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {user.phone ||
                      "No phone"}
                  </td>
                  <td>
                    <span
                      className={`role-badge ${user.role === 2 ? "user" : "admin"}`}
                    >
                      {user.roleProfile?.name || user.roleLabel}
                    </span>
                  </td>
                  <td>{formatDisplayDate(user.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      {canEdit && (isAdministrator(currentUser) || user.role === 2) && <button
                        className="icon-action edit"
                        type="button"
                        aria-label={`Edit ${user.name}`}
                        title="Edit user"
                        onClick={() => openEdit(user)}
                      >
                        <Edit3 size={16} />
                      </button>}
                      {canDelete && (isAdministrator(currentUser) || user.role === 2) && <button
                        className="icon-action delete"
                        type="button"
                        aria-label={`Delete ${user.name}`}
                        title="Delete user"
                        onClick={() => setDialog({ mode: "delete", user })}
                      >
                        <Trash2 size={16} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table" colSpan="6">
                  No accounts match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {dialog?.mode !== "delete" && dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <form className="user-modal" onSubmit={submitUser}>
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Access control</span>
                <h2>
                  {dialog.mode === "create"
                    ? "Add a new user"
                    : "Edit user details"}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                Full name
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                />
              </label>
              <label>
                Work email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="name@company.com"
                />
              </label>
              <label>
                Phone number
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="Optional"
                />
              </label>
              <label>
                Role
                <Select
                  className="antd-crm-select user-role-select"
                  value={selectedRole}
                  placeholder="Select a role"
                  options={roleChoices}
                  optionFilterProp="label"
                  showSearch
                  popupClassName="user-role-dropdown"
                  optionRender={(option) => <div className="user-role-option"><strong>{option.data.label}</strong><small>{option.data.description}</small></div>}
                  labelRender={({ label }) => <span className="user-role-selected">{label}</span>}
                  onChange={(value) => {
                    setForm({ ...form, role: value === "system:administrator" ? 1 : 2, roleProfile: value.startsWith("custom:") ? value.slice(7) : "" });
                  }}
                />
              </label>
              <label className="full-field">
                {dialog.mode === "create"
                  ? "Temporary password"
                  : "New password (optional)"}
                <input
                  required={dialog.mode === "create"}
                  type="password"
                  minLength="8"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder="At least 8 characters"
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button className="primary-action" type="submit">
                {dialog.mode === "create" ? "Create user" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {dialog?.mode === "delete" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <div className="confirm-modal">
            <div className="confirm-icon">
              <Trash2 size={20} />
            </div>
            <h2>Delete this user?</h2>
            <p>
              This will permanently remove <strong>{dialog.user.name}</strong>{" "}
              and revoke their CRM access.
            </p>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className="danger-action"
                type="button"
                onClick={deleteUser}
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default UsersPanel;
