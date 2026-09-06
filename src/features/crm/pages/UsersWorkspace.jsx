import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Edit3, Plus, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { api } from "../../../services/api.js";
import { RoleDropdown } from "../CrmControls.jsx";
import { formatDisplayDate } from "../CrmUtils.jsx";

function UsersPanel({ users, setUsers, token }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: 2,
  });
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
  function openCreate() {
    setForm({ name: "", email: "", phone: "", password: "", role: 2 });
    setDialog({ mode: "create" });
  }
  function openEdit(user) {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role === 2 ? 2 : 1,
    });
    setDialog({ mode: "edit", user });
  }
  async function submitUser(event) {
    event.preventDefault();
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
        <button className="primary-action" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add user
        </button>
      </div>
      <div className="user-toolbar">
        <div className="user-tabs">
          <button
            className={tab === "all" ? "active" : ""}
            type="button"
            onClick={() => setTab("all")}
          >
            All accounts
          </button>
          <button
            className={tab === "users" ? "active" : ""}
            type="button"
            onClick={() => setTab("users")}
          >
            <UserRound size={15} />
            Users
          </button>
          <button
            className={tab === "admins" ? "active" : ""}
            type="button"
            onClick={() => setTab("admins")}
          >
            <ShieldCheck size={15} />
            Admins
          </button>
        </div>
        <label className="user-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
          />
        </label>
      </div>
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
                <tr key={user._id}>
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
                      {user.roleLabel}
                    </span>
                  </td>
                  <td>{formatDisplayDate(user.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-action edit"
                        type="button"
                        aria-label={`Edit ${user.name}`}
                        title="Edit user"
                        onClick={() => openEdit(user)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        type="button"
                        aria-label={`Delete ${user.name}`}
                        title="Delete user"
                        onClick={() => setDialog({ mode: "delete", user })}
                      >
                        <Trash2 size={16} />
                      </button>
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
                <RoleDropdown
                  value={form.role}
                  onChange={(role) => setForm({ ...form, role })}
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
