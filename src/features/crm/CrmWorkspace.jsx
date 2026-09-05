/* eslint-disable no-irregular-whitespace */
import { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { createRoot } from "react-dom/client";
import { toast } from "react-toastify";
import {
  ChevronDown,
  ContactRound,
  Edit3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Package,
  FolderTree,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import icon from "../../assets/jb-corporation-icon.png";
import logo from "../../assets/jb-corporation-logo.png";
import ProductMasterPanel from "../../components/ProductMasterPanel.jsx";
import CategoryMasterPanel from "../../components/CategoryMasterPanel.jsx";
import indiaLocations from "../../data/indiaLocations.json";
import { api, clearSession, getSession } from "../../services/api.js";
import { navigate } from "../../utils/navigation.js";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: ContactRound, label: "Leads", key: "leads" },
  { icon: FileText, label: "Quotation Management", key: "quotations" },
];

function formatDisplayDate(value) {
  if (!value) return "";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "";
}

function PhoneLink({ phone, fallback = "No phone" }) {
  if (!phone || !/\d/.test(String(phone))) return fallback;
  const dialNumber = String(phone).replace(/[^\d+]/g, "");
  return (
    <a className="phone-link" href={`tel:${dialNumber}`}>
      {phone}
    </a>
  );
}

function CrmWorkspace({ section = "dashboard" }) {
  const session = getSession();
  const isAdmin = [1, 3].includes(session.user.role);
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [leadOptions, setLeadOptions] = useState([]);
  const activeSection = section;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth <= 900,
  );
  const mobileLayoutRef = useRef(window.innerWidth <= 900);

  useEffect(() => {
    function updateSidebarForViewport() {
      const isMobileLayout = window.innerWidth <= 900;
      if (isMobileLayout !== mobileLayoutRef.current) {
        mobileLayoutRef.current = isMobileLayout;
        setSidebarCollapsed(isMobileLayout);
      }
    }
    window.addEventListener("resize", updateSidebarForViewport);
    return () => window.removeEventListener("resize", updateSidebarForViewport);
  }, []);

  useEffect(() => {
    api
      .dashboard(session.token)
      .then(setData)
      .catch(() => {
        toast.error("Your session has expired. Please log in again.");
        clearSession();
        navigate("/login");
      });
  }, [session.token]);

  useEffect(() => {
    if (!["users", "leads"].includes(activeSection) || !isAdmin) return;
    api
      .users(session.token)
      .then((response) => setUsers(response.users))
      .catch((error) => toast.error(error.message));
  }, [activeSection, isAdmin, session.token]);

  useEffect(() => {
    if (!['products', 'categories'].includes(activeSection)) return;
    api.categories(session.token).then((response) => setCategories(response.categories || [])).catch((error) => toast.error(error.message));
  }, [activeSection, session.token]);

  useEffect(() => {
    if (activeSection !== "leads") return;
    api.leadOptions(session.token).then((response) => setLeadOptions(response.options || [])).catch((error) => toast.error(error.message));
  }, [activeSection, session.token]);

  useEffect(() => {
    if (activeSection !== "quotations") return;
    api
      .quotations(session.token)
      .then((response) => setQuotations(response.quotations))
      .catch((error) => toast.error(error.message));
  }, [activeSection, session.token]);

  useEffect(() => {
    if (!["products", "quotations"].includes(activeSection)) return;
    api
      .products(session.token)
      .then((response) => setProducts(response.products))
      .catch((error) => toast.error(error.message));
  }, [activeSection, isAdmin, session.token]);

  function logout() {
    clearSession();
    toast.success("You have been signed out.");
    navigate("/login");
  }

  function selectSection(section) {
    if (window.innerWidth <= 900) setSidebarCollapsed(true);
    navigate(
      section === "users"
        ? "/users"
        : section === "leads"
          ? "/leads"
        : section === "products"
              ? "/products"
              : section === "categories"
                ? "/categories"
              : section === "quotations"
                ? "/quotations"
              : "/dashboard",
    );
  }

  return (
    <main
      className={`crm-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
    >
      <aside className="crm-sidebar">
        <div className="crm-brand">
          <img src={sidebarCollapsed ? icon : logo} alt="JB Corporation" />
        </div>
        <nav className="crm-navigation" aria-label="CRM navigation">
          {navigationItems.map((item) => {
            const MenuIcon = item.icon;
            return (
              <button
                className={activeSection === item.key ? "active" : ""}
                data-tooltip={item.label}
                key={item.key}
                type="button"
                onClick={() => selectSection(item.key)}
              >
                <MenuIcon aria-hidden="true" size={19} strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
          {isAdmin && (
            <button
              className={activeSection === "categories" ? "active" : ""}
              data-tooltip="Category Master"
              type="button"
              onClick={() => selectSection("categories")}
            >
              <FolderTree aria-hidden="true" size={19} strokeWidth={1.8} />
              Category Master
            </button>
          )}
          {isAdmin && (
            <button
              className={activeSection === "products" ? "active" : ""}
              data-tooltip="Product Master"
              type="button"
              onClick={() => selectSection("products")}
            >
              <Package aria-hidden="true" size={19} strokeWidth={1.8} />
              Product Master
            </button>
          )}
          {isAdmin && (
            <button
              className={activeSection === "users" ? "active" : ""}
              data-tooltip="User Management"
              type="button"
              onClick={() => selectSection("users")}
            >
              <UserRound aria-hidden="true" size={19} strokeWidth={1.8} />
              User Management
            </button>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">
            {session.user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{session.user.name}</strong>
            <span>{isAdmin ? "Administrator" : "CRM user"}</span>
          </div>
          <button type="button" onClick={logout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <button
        className="mobile-sidebar-backdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setSidebarCollapsed(true)}
      />

      <section className="crm-workspace">
        <header className="crm-header">
          <div className="header-title">
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
            <div>
              <h2>Internal CRM</h2>
            </div>
          </div>
          <div className="header-role">
            <ShieldCheck size={16} />
            <span>{isAdmin ? "Admin" : "User"}</span>
          </div>
        </header>

        <div className="crm-content">
          {activeSection === "users" ? (
            <UsersPanel
              users={users}
              setUsers={setUsers}
              token={session.token}
            />
          ) : activeSection === "leads" ? (
            <LeadsPanel
              leads={leads}
              setLeads={setLeads}
              isAdmin={isAdmin}
              users={users}
              token={session.token}
              currentUser={session.user}
              leadOptions={leadOptions}
              setLeadOptions={setLeadOptions}
            />
          ) : activeSection === "products" ? (
            <ProductMasterPanel
              products={products}
              setProducts={setProducts}
              categories={categories}
              token={session.token}
            />
          ) : activeSection === "categories" ? (
            <CategoryMasterPanel categories={categories} setCategories={setCategories} token={session.token} />
          ) : activeSection === "quotations" ? (
            <QuotationsPanel
              quotations={quotations}
              setQuotations={setQuotations}
              token={session.token}
              isAdmin={isAdmin}
              products={products}
            />
          ) : (
            <DashboardOverview data={data} session={session} />
          )}
        </div>
      </section>
    </main>
  );
}

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
          <small>{option.data.product.partCode || option.data.product.code} · ₹{option.data.product.mrp ?? option.data.product.salePrice ?? 0} / {option.data.product.unit || 'Piece'}</small>
        </span>
      )}
    />
  );
}

function QuotationsPanel({ quotations, setQuotations, token, isAdmin, products }) {
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ customerName: "", company: "", email: "", phone: "", items: [], status: "Draft", notes: "" });

  function openCreate() {
    setForm({ customerName: "", company: "", email: "", phone: "", items: [{ productId: "", quantity: 1 }], status: "Draft", notes: "" });
    setDialog({ mode: "create" });
  }
  function openEdit(quotation) {
    setForm({ customerName: quotation.customerName, company: quotation.company, email: quotation.email, phone: quotation.phone, items: quotation.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })) || [], status: quotation.status, notes: quotation.notes });
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
        <div><h1>Quotation Management</h1><p>{isAdmin ? "View and manage quotations from the entire team." : "View and manage quotations added by you."}</p></div>
        <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} />Add quotation</button>
      </div>
      <div className="quotation-table-wrap">
        <table className="quotation-table">
          <thead><tr><th>Customer</th><th>Contact</th><th>Amount</th><th>Status</th><th>Created by</th><th>Created</th><th className="actions-heading">Actions</th></tr></thead>
          <tbody>
            {quotations.length ? quotations.map((quotation) => (
              <tr key={quotation._id}>
                <td><strong>{quotation.customerName}</strong><small>{quotation.company || "No company"}</small><small>{quotation.items?.map((item) => `${item.productName} × ${item.quantity}`).join(", ") || "No products"}</small></td>
                <td><span>{quotation.email || "No email"}</span><small><PhoneLink phone={quotation.phone} /></small></td>
                <td>₹{Number(quotation.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td><span className={`quotation-status quotation-status-${quotation.status.toLowerCase()}`}>{quotation.status}</span></td>
                <td>{quotation.createdByName || "You"}</td>
                <td>{formatDisplayDate(quotation.createdAt)}</td>
                <td><div className="table-actions"><button className="icon-action edit" type="button" title="Edit quotation" onClick={() => openEdit(quotation)}><Edit3 size={16} /></button><button className="icon-action delete" type="button" title="Delete quotation" onClick={() => setDialog({ mode: "delete", quotation })}><Trash2 size={16} /></button></div></td>
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
                {form.items.map((item, index) => { const product = products.find((entry) => String(entry._id) === String(item.productId)); return <div className="quotation-item-row" key={`${index}-${item.productId}`}><select required value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })}><option value="">Select product</option>{products.filter((entry) => entry.isActive !== false).map((entry) => <option key={entry._id} value={entry._id}>{entry.description || entry.name} ({entry.partCode || entry.code}) — ₹{entry.mrp ?? entry.salePrice ?? 0}</option>)}</select><input required min="0.01" step="0.01" type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" /><span>₹{product ? (Number(item.quantity || 0) * Number(product.mrp ?? product.salePrice ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}</span>{form.items.length > 1 && <button className="icon-action delete" type="button" title="Remove product" onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button>}</div>; })}
                <div className="quotation-total">Total <strong>₹{quotationTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></div>
              </div>
              <label>Status<LeadDropdown value={form.status} options={["Draft", "Sent", "Accepted", "Rejected"]} onChange={(status) => setForm({ ...form, status })} /></label>
              <label className="full-field">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add quotation notes" /></label>
            </div>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-action" type="submit" disabled={!products.length}>{dialog.mode === "create" ? "Create quotation" : "Save changes"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

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
                      "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}
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

function LegacyRoleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const role =
    value === 1
      ? { label: "Admin", detail: "Full CRM access" }
      : { label: "User", detail: "Standard CRM access" };
  return (
    <div ref={dropdownRef} className={`role-dropdown${open ? " open" : ""}`}>
      <button
        className="role-select"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>{role.label}</strong>
          <small>{role.detail}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="role-options" role="listbox" aria-label="Select role">
          <button
            className={value === 2 ? "selected" : ""}
            type="button"
            role="option"
            aria-selected={value === 2}
            onClick={() => {
              onChange(2);
              setOpen(false);
            }}
          >
            <UserRound size={16} />
            <span>
              <strong>User</strong>
              <small>Standard CRM access</small>
            </span>
          </button>
          <button
            className={value === 1 ? "selected" : ""}
            type="button"
            role="option"
            aria-selected={value === 1}
            onClick={() => {
              onChange(1);
              setOpen(false);
            }}
          >
            <ShieldCheck size={16} />
            <span>
              <strong>Admin</strong>
              <small>Full CRM access</small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function cleanupLeadTableEnhancements() {
  window.dispatchEvent(new Event("jb:lead-table-update-start"));
  document
    .querySelectorAll(".table-select-cell, .table-lead-date-cell")
    .forEach((cell) => cell.remove());
  document
    .querySelectorAll(".table-select-heading, .table-lead-date-heading")
    .forEach((cell) => cell.remove());
}

function finishLeadTableEnhancements(leads) {
  requestAnimationFrame(() =>
    window.dispatchEvent(
      new CustomEvent("jb:lead-table-update-end", { detail: { leads } }),
    ),
  );
}

function LeadOptionManager({ type, label, options, token, onClose, onChanged }) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(null);
  async function saveOption(event) {
    event.preventDefault();
    if (!value.trim()) return;
    try {
      const result = editing
        ? await api.updateLeadOption(token, editing._id, { value })
        : await api.createLeadOption(token, { type, value });
      onChanged(editing ? options.map((item) => item._id === result.option._id ? result.option : item) : [...options, result.option]);
      setValue(""); setEditing(null); toast.success(editing ? "Dropdown value updated." : "Dropdown value added.");
    } catch (error) { toast.error(error.message); }
  }
  async function removeOption(option) {
    try {
      await api.deleteLeadOption(token, option._id);
      onChanged(options.filter((item) => item._id !== option._id));
      toast.success("Dropdown value deleted.");
    } catch (error) { toast.error(error.message); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="confirm-modal lead-option-modal"><div className="modal-heading"><div><span className="dashboard-kicker">Lead configuration</span><h2>{label} values</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div><form className="lead-option-form" onSubmit={saveOption}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${label.toLowerCase()}`} /><button className="primary-action" type="submit">{editing ? "Save" : "Add"}</button>{editing && <button className="secondary-action" type="button" onClick={() => { setEditing(null); setValue(""); }}>Cancel</button>}</form><div className="lead-option-list">{options.map((option) => <div className="lead-option-row" key={option._id}><span>{option.value}</span><button className="lead-option-icon edit" type="button" title={`Edit ${option.value}`} aria-label={`Edit ${option.value}`} onClick={() => { setEditing(option); setValue(option.value); }}><Edit3 size={15} /></button><button className="lead-option-icon delete" type="button" title={`Delete ${option.value}`} aria-label={`Delete ${option.value}`} onClick={() => removeOption(option)}><Trash2 size={15} /></button></div>)}</div></div></div>;
}

function LeadsPanel({ leads, setLeads, isAdmin, users, token, currentUser, leadOptions, setLeadOptions }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [dialog, setDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [optionDialog, setOptionDialog] = useState(null);
  const [followUpDialog, setFollowUpDialog] = useState(null);
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);
  const speechRecognitionRef = useRef(null);
  const voiceBaseDescriptionRef = useRef("");
  const [followUpForm, setFollowUpForm] = useState({
    date: "",
    description: "",
    nextDate: "",
  });
  const [form, setForm] = useState({
    name: "",
    company: "",
    address1: "",
    address2: "",
    area: "",
    city: "",
    state: "",
    email: "",
    website: "",
    phone: "",
    customerType: "",
    segment: "",
    companyPersons: [{ name: "", email: "", contactNumber: "", designation: "", department: "" }],
    leadSource: "",
    assignedTo: "",
    stage: "New",
    nextFollowUp: "",
    notes: "",
  });
  const filteredLeads = leads;
  const assignableUsers = isAdmin
    ? users
    : [{ _id: currentUser.id, name: currentUser.name, roleLabel: "User" }];
  function optionsFor(type) {
    const saved = leadOptions.filter((option) => option.type === type).map((option) => option.value);
    return saved;
  }
  function updateOptionList(nextOptions) {
    setLeadOptions((current) => [...current.filter((option) => option.type !== optionDialog), ...nextOptions]);
  }
  function updateCompanyPerson(index, changes) {
    setForm((current) => ({ ...current, companyPersons: current.companyPersons.map((person, personIndex) => personIndex === index ? { ...person, ...changes } : person) }));
  }
  useEffect(() => {
    const params = { page, limit: 10, status: status === "All" ? undefined : status, search: search.trim() };
    if (dateRange !== "all") {
      const end = dayjs().add(1, "day");
      params.dateTo = end.format("YYYY-MM-DD");
      params.dateFrom = (dateRange === "today" ? dayjs() : dayjs().subtract(Number(dateRange) - 1, "day")).format("YYYY-MM-DD");
    }
    let active = true;
    api.leads(token, params)
      .then((response) => {
        if (!active) return;
        setLeads(response.leads);
        setPagination(response.pagination || { page, limit: 10, total: response.leads.length, totalPages: 1 });
      })
      .catch((error) => active && toast.error(error.message));
    return () => { active = false; };
  }, [dateRange, page, search, setLeads, status, token]);
  function commitLeads(nextLeads) {
    cleanupLeadTableEnhancements();
    setLeads([...nextLeads]);
    finishLeadTableEnhancements(nextLeads);
  }
  useEffect(() => {
    function refreshLeads(event) {
      const nextLeads = event.detail?.leads;
      if (!Array.isArray(nextLeads)) return;
      cleanupLeadTableEnhancements();
      setLeads([...nextLeads]);
      finishLeadTableEnhancements(nextLeads);
    }
    window.addEventListener("jb:leads-refreshed", refreshLeads);
    return () => window.removeEventListener("jb:leads-refreshed", refreshLeads);
  }, [setLeads]);
  const initialLeadDate =
    form.nextFollowUp || new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (!dialog || !["create", "edit"].includes(dialog.mode)) return undefined;
    const fields = document.querySelector(".lead-modal .modal-fields");
    if (!fields || fields.querySelector(".lead-date-field")) return undefined;
    const label = document.createElement("div");
    label.className = "lead-date-field";
    label.textContent = "Lead date";
    const mount = document.createElement("div");
    label.append(mount);
    fields.insertBefore(label, fields.lastElementChild);
    const root = createRoot(mount);
    root.render(
      <AntDatePicker
        value={initialLeadDate}
        onChange={(nextFollowUp) =>
          setForm((current) => ({ ...current, nextFollowUp }))
        }
      />,
    );
    return () => {
      root.unmount();
      label.remove();
    };
  }, [dialog, initialLeadDate]);
  useEffect(() => {
    if (dialog?.mode === "create" && !form.nextFollowUp)
      setForm((current) => ({
        ...current,
        nextFollowUp: new Date().toISOString().slice(0, 10),
      }));
  }, [dialog, form.nextFollowUp]);
  useEffect(() => {
    if (!followUpDialog || followUpDialog.mode === "delete") return undefined;
    const mount = document.querySelector(".followup-form-modal .date-picker");
    if (!mount) return undefined;
    const nativeInput = mount.querySelector('input[type="date"]');
    if (nativeInput) nativeInput.style.display = "none";
    const host = document.createElement("span");
    host.className = "antd-date-mount";
    mount.append(host);
    const fieldLabel = mount.closest("label");
    function preventLabelDateOpen(event) {
      if (fieldLabel && !host.contains(event.target)) event.preventDefault();
    }
    fieldLabel?.addEventListener("click", preventLabelDateOpen, true);
    const root = createRoot(host);
    root.render(
      <AntDatePicker
        value={followUpForm.date}
        onChange={(date) =>
          setFollowUpForm((current) => ({ ...current, date }))
        }
        required
      />,
    );
    const fields = mount.closest(".modal-fields");
    const nextDateField = document.createElement("div");
    nextDateField.className = "followup-next-date-field";
    const nextDateLabel = document.createElement("span");
    nextDateLabel.textContent = "Next follow-up date";
    const nextDateHost = document.createElement("span");
    nextDateHost.className = "antd-date-mount";
    const nextDateHint = document.createElement("small");
    nextDateHint.textContent = "Choose the date for the next planned action.";
    nextDateField.append(nextDateLabel, nextDateHost, nextDateHint);
    fields?.insertBefore(nextDateField, fields.querySelector(".full-field"));
    const nextDateRoot = createRoot(nextDateHost);
    nextDateRoot.render(
      <AntDatePicker
        value={followUpForm.nextDate}
        onChange={(nextDate) =>
          setFollowUpForm((current) => ({ ...current, nextDate }))
        }
      />,
    );
    return () => {
      fieldLabel?.removeEventListener("click", preventLabelDateOpen, true);
      root.unmount();
      nextDateRoot.unmount();
      host.remove();
      nextDateField.remove();
      if (nativeInput) nativeInput.style.display = "";
    };
  }, [followUpDialog, followUpForm.date, followUpForm.nextDate]);
  useEffect(
    () => () => {
      speechRecognitionRef.current?.abort();
    },
    [],
  );

  function stopVoiceTyping() {
    const recognition = speechRecognitionRef.current;
    if (recognition) recognition.stop();
  }

  function closeFollowUpEditor() {
    speechRecognitionRef.current?.abort();
    setFollowUpDialog(null);
  }

  function toggleVoiceTyping() {
    if (isVoiceTyping) {
      stopVoiceTyping();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "Voice typing is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-IN";
    voiceBaseDescriptionRef.current = followUpForm.description.trim();
    speechRecognitionRef.current = recognition;

    recognition.onstart = () => setIsVoiceTyping(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const base = voiceBaseDescriptionRef.current;
      setFollowUpForm((current) => ({
        ...current,
        description: [base, transcript].filter(Boolean).join(" "),
      }));
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission is required for voice typing."
          : event.error === "no-speech"
            ? "No speech was detected. Please try again."
            : "Voice typing stopped unexpectedly. Please try again.";
      toast.error(message);
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsVoiceTyping(false);
    };

    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
      setIsVoiceTyping(false);
      toast.error("Unable to start voice typing. Please try again.");
    }
  }

  function openCreate() {
    setForm({
      name: "",
      company: "",
      address1: "", address2: "", area: "", city: "", state: "",
      email: "",
      website: "",
      phone: "",
      customerType: "", segment: "", companyPersons: [{ name: "", email: "", contactNumber: "", designation: "", department: "" }], leadSource: "",
      assignedTo: currentUser.id,
      stage: "New",
      nextFollowUp: "",
      notes: "",
    });
    setDialog({ mode: "create" });
  }
  function openEdit(lead) {
    setForm({
      name: lead.name,
      company: lead.company === "N/A" ? "" : lead.company,
      address1: lead.address1 || "", address2: lead.address2 || "", area: lead.area || "", city: lead.city || "", state: lead.state || "",
      email: lead.email,
      website: lead.website || "",
      phone: lead.phone,
      customerType: lead.customerType || "", segment: lead.segment || "", companyPersons: lead.companyPersons?.length ? lead.companyPersons : [{ name: "", email: "", contactNumber: "", designation: "", department: "" }], leadSource: lead.leadSource || lead.source || "",
      assignedTo: lead.assignedTo,
      stage: lead.stage || lead.status || "New",
      nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : "",
      notes: lead.notes || "",
    });
    setDialog({ mode: "edit", lead });
  }
  async function updateInline(lead, changes) {
    try {
      const result = await api.updateLead(token, lead._id, {
        name: lead.name,
        company: lead.company === "N/A" ? "" : lead.company,
        address1: lead.address1 || "", address2: lead.address2 || "", area: lead.area || "", city: lead.city || "", state: lead.state || "",
        email: lead.email,
        website: lead.website || "",
        phone: lead.phone,
        contactNumber: lead.phone,
        customerType: lead.customerType || "Individual", segment: lead.segment || "SMB", companyPersons: lead.companyPersons || [],
        assignedTo: lead.assignedTo,
        leadSource: lead.leadSource || lead.source,
        stage: lead.stage || lead.status,
        nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : "",
        notes: lead.notes || "",
        ...changes,
      });
      commitLeads(
        leads.map((item) =>
          item._id === result.lead._id ? result.lead : item,
        ),
      );
      setStatus("All");
      toast.success("Lead updated.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function submitLead(event) {
    event.preventDefault();
    try {
      const mode = dialog.mode;
      const result =
        mode === "create"
          ? await api.createLead(token, form)
          : await api.updateLead(token, dialog.lead._id, form);
      commitLeads(
        mode === "create"
          ? [result.lead, ...leads]
          : leads.map((lead) =>
              lead._id === result.lead._id ? result.lead : lead,
            ),
      );
      setStatus("All");
      setSearch("");
      setDialog(null);
      toast.success(
        mode === "create"
          ? "Lead added successfully."
          : "Lead updated successfully.",
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function deleteLead(lead) {
    setDeleteDialog(lead);
  }
  async function confirmDeleteLead() {
    try {
      await api.deleteLead(token, deleteDialog._id);
      commitLeads(leads.filter((item) => item._id !== deleteDialog._id));
      setDeleteDialog(null);
      toast.success("Lead deleted successfully.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  function openFollowupCreate(lead) {
    stopVoiceTyping();
    setFollowUpForm({
      date: dayjs().format("YYYY-MM-DD"),
      description: "",
      nextDate: "",
    });
    setFollowUpDialog({ mode: "create", lead });
  }
  function openFollowupEdit(lead, item) {
    stopVoiceTyping();
    setFollowUpForm({
      date: item.date ? item.date.slice(0, 10) : dayjs().format("YYYY-MM-DD"),
      description: item.description || "",
      nextDate: item.nextDate ? item.nextDate.slice(0, 10) : "",
    });
    setFollowUpDialog({ mode: "edit", lead, item });
  }
  async function submitFollowup(event) {
    event.preventDefault();
    stopVoiceTyping();
    try {
      const mode = followUpDialog.mode;
      const result =
        mode === "create"
          ? await api.createFollowUp(
              token,
              followUpDialog.lead._id,
              followUpForm,
            )
          : await api.updateFollowUp(
              token,
              followUpDialog.lead._id,
              followUpDialog.item._id,
              followUpForm,
            );
      commitLeads(
        leads.map((lead) =>
          lead._id === result.lead._id ? result.lead : lead,
        ),
      );
      setDialog({ mode: "followups", lead: result.lead });
      setFollowUpDialog(null);
      toast.success(
        mode === "create" ? "Follow-up added." : "Follow-up updated.",
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function deleteFollowup() {
    try {
      const result = await api.deleteFollowUp(
        token,
        followUpDialog.lead._id,
        followUpDialog.item._id,
      );
      commitLeads(
        leads.map((lead) =>
          lead._id === result.lead._id ? result.lead : lead,
        ),
      );
      setDialog({ mode: "followups", lead: result.lead });
      setFollowUpDialog(null);
      toast.success("Follow-up deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  const details = dialog?.mode === "details" ? dialog.lead : null;
  const followUps = dialog?.lead?.followUps?.length
    ? dialog.lead.followUps
    : dialog?.lead?.nextFollowUp
      ? [
          {
            date: dialog.lead.createdAt,
            description: dialog.lead.notes || "Lead follow-up",
            nextDate: dialog.lead.nextFollowUp,
          },
        ]
      : [];
  return (
    <div className="crm-content-inner leads-page">
      <div className="section-heading">
        <div>
          <h1>Leads</h1>
          <p>Click a lead name to view its complete details.</p>
        </div>
        <button className="primary-action" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add lead
        </button>
      </div>
      <div className="lead-toolbar">
        <div className="lead-status-tabs">
          {["All", "New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"].map(
            (item) => (
              <button
                className={status === item ? "active" : ""}
                type="button"
                key={item}
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <label className="user-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search leads"
          />
        </label>
        <label className="lead-date-filter">
          <span>Date</span>
          <Select
            className="antd-crm-select lead-date-select"
            value={dateRange}
            showSearch
            optionFilterProp="label"
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All time" }, { value: "today", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]}
          />
        </label>
      </div>
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>City</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Stage</th>
              <th>Assigned to</th>
              <th>Follow-up</th>
              <th className="actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length ? (
              filteredLeads.map((lead) => (
                <tr
                  key={lead._id}
                  data-lead-id={lead._id}
                  onClick={() => setDialog({ mode: "details", lead })}
                >
                  <td>
                    <button
                      className="lead-name-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ mode: "details", lead });
                      }}
                    >
                      <span>{(lead.name || "?").slice(0, 1).toUpperCase()}</span>
                      <strong>{lead.name}</strong>
                    </button>
                  </td>
                  <td>{lead.city || "N/A"}</td>
                  <td>
                    <div className="lead-contact">
                      <span>{lead.email || "No email"}</span>
                      <small>
                        <PhoneLink phone={lead.phone} />
                      </small>
                    </div>
                  </td>
                  <td>{lead.leadSource || lead.source || "N/A"}</td>
                  <td>
                    <div onClick={(event) => event.stopPropagation()}>
                      <LeadDropdown
                        value={lead.status}
                        options={["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"]}
                        onChange={(nextStage) =>
                          updateInline(lead, { stage: nextStage, status: nextStage })
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <div onClick={(event) => event.stopPropagation()}>
                      <AssigneeDropdown
                        users={assignableUsers}
                        value={lead.assignedTo}
                        disabled={!isAdmin}
                        onChange={(assignedTo) =>
                          updateInline(lead, { assignedTo })
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      className="followup-link"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ mode: "followups", lead });
                      }}
                    >
                      {lead.followUps?.length || (lead.nextFollowUp ? 1 : 0)}{" "}
                      record
                      {(lead.followUps?.length ||
                        (lead.nextFollowUp ? 1 : 0)) === 1
                        ? ""
                        : "s"}
                    </button>
                  </td>
                  <td>
                    <div
                      className="table-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="icon-action edit"
                        type="button"
                        title="Edit lead"
                        onClick={() => openEdit(lead)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        type="button"
                        title="Delete lead"
                        onClick={() => deleteLead(lead)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table" colSpan="8">
                  No leads match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="lead-pagination">
        <span>
          {pagination.total} lead{pagination.total === 1 ? "" : "s"}
        </span>
        <div>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <strong>Page {page} of {pagination.totalPages}</strong>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>
      {dialog && ["create", "edit"].includes(dialog.mode) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <form className="user-modal lead-modal" onSubmit={submitLead}>
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Lead workspace</span>
                <h2>
                  {dialog.mode === "create"
                    ? "Add a new lead"
                    : "Edit lead details"}
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
                Name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter customer name"
                />
              </label>
              <label>Company name<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" /></label>
              <label>
                Address 1
                <input
                  
                  value={form.address1}
                  onChange={(event) =>
                    setForm({ ...form, address1: event.target.value })
                  }
                  placeholder="Address line 1"
                />
              </label>
              <label>Address 2<input value={form.address2} onChange={(event) => setForm({ ...form, address2: event.target.value })} placeholder="Address line 2" /></label>
              <label>Area<input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Area" /></label>
              <label>State<LeadDropdown value={form.state} options={Object.keys(indiaLocations)} placeholder="Select state" showStatusIndicator={false} onChange={(state) => setForm({ ...form, state, city: "" })} /></label>
              <label>City<LeadDropdown value={form.city} options={form.state ? indiaLocations[form.state] || [] : []} placeholder={form.state ? "Select city" : "Select state first"} showStatusIndicator={false} disabled={!form.state} onChange={(city) => setForm({ ...form, city })} /></label>
              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="contact@company.com"
                />
              </label>
              <label>
                Website
                <input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://example.com" />
              </label>
              <label>
                Contact Number
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
                Customer Type
                <LeadDropdown value={form.customerType} options={optionsFor("customerType")} placeholder="Select customer type" onChange={(customerType) => setForm({ ...form, customerType })} showStatusIndicator={false} manageLabel="Manage customer types" onManage={isAdmin ? () => setOptionDialog("customerType") : undefined} />
              </label>
              <label>
                Segment
                <LeadDropdown value={form.segment} options={optionsFor("segment")} placeholder="Select segment" onChange={(segment) => setForm({ ...form, segment })} showStatusIndicator={false} manageLabel="Manage segments" onManage={isAdmin ? () => setOptionDialog("segment") : undefined} />
              </label>
              <div className="full-field company-persons-field">
                <div className="company-persons-heading"><strong>Company Person Detail</strong><button className="secondary-action" type="button" onClick={() => setForm({ ...form, companyPersons: [...form.companyPersons, { name: "", email: "", contactNumber: "", designation: "", department: "" }] })}><Plus size={14} />Add person</button></div>
                {form.companyPersons.map((person, index) => <div className="company-person-row" key={index}><input value={person.name} onChange={(event) => updateCompanyPerson(index, { name: event.target.value })} placeholder="Name" /><input type="email" value={person.email} onChange={(event) => updateCompanyPerson(index, { email: event.target.value })} placeholder="Email" /><input value={person.contactNumber} onChange={(event) => updateCompanyPerson(index, { contactNumber: event.target.value.replace(/\D/g, "") })} placeholder="Contact Number" /><input value={person.designation} onChange={(event) => updateCompanyPerson(index, { designation: event.target.value })} placeholder="Designation" /><input value={person.department} onChange={(event) => updateCompanyPerson(index, { department: event.target.value })} placeholder="Department" />{form.companyPersons.length > 1 && <button className="icon-action delete" type="button" title="Remove person" onClick={() => setForm({ ...form, companyPersons: form.companyPersons.filter((_, personIndex) => personIndex !== index) })}><Trash2 size={15} /></button>}</div>)}
              </div>
              <label>
                Lead Source
                <LeadDropdown value={form.leadSource} options={optionsFor("leadSource")} placeholder="Select lead source" onChange={(leadSource) => setForm({ ...form, leadSource })} showStatusIndicator={false} manageLabel="Manage lead sources" onManage={isAdmin ? () => setOptionDialog("leadSource") : undefined} />
              </label>
              <label>
                Assign to
                <AssigneeDropdown
                  users={assignableUsers}
                  value={form.assignedTo}
                  disabled={!isAdmin}
                  onChange={(assignedTo) => setForm({ ...form, assignedTo })}
                />
                {!isAdmin && (
                  <small className="field-hint">
                    Leads created by you stay assigned to your account.
                  </small>
                )}
              </label>
              <label>
                Stage
                <LeadDropdown
                  value={form.stage}
                  options={["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"]}
                  onChange={(stage) => setForm({ ...form, stage })}
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
                {dialog.mode === "create" ? "Create lead" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteDialog(null)}>
          <div className="confirm-modal">
            <div className="confirm-icon"><Trash2 size={20} /></div>
            <h2>Delete this lead?</h2>
            <p>This will permanently remove <strong>{deleteDialog.name || "this lead"}</strong> and all its details.</p>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDeleteDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={confirmDeleteLead}>Delete lead</button></div>
          </div>
        </div>
      )}
      {optionDialog && isAdmin && (
        <LeadOptionManager
          type={optionDialog}
          label={optionDialog === "customerType" ? "Customer type" : optionDialog === "leadSource" ? "Lead source" : "Segment"}
          options={leadOptions.filter((option) => option.type === optionDialog)}
          token={token}
          onClose={() => setOptionDialog(null)}
          onChanged={(nextOptions) => {
            updateOptionList(nextOptions);
          }}
        />
      )}
      {dialog?.mode === "details" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <div className="lead-details-modal">
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Lead details</span>
                <h2>{details.name}</h2>
                <p>{details.company || "N/A"}</p>
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
            <div className="lead-detail-grid">
              <div><span>Address 1</span><strong>{details.address1 || "No address"}</strong></div>
              <div><span>Address 2</span><strong>{details.address2 || "—"}</strong></div>
              <div><span>Area</span><strong>{details.area || "—"}</strong></div>
              <div><span>City</span><strong>{details.city || "—"}</strong></div>
              <div><span>State</span><strong>{details.state || "—"}</strong></div>
              <div>
                <span>Email</span>
                <strong>{details.email || "No email"}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>
                  <PhoneLink phone={details.phone} />
                </strong>
              </div>
              <div>
                <span>Customer type</span>
                <strong>{details.customerType || "—"}</strong>
              </div>
              <div>
                <span>Segment</span>
                <strong>{details.segment || "—"}</strong>
              </div>
              <div>
                <span>Website</span>
                <strong>{details.website || "—"}</strong>
              </div>
              <div>
                <span>Lead source</span>
                <strong>{details.leadSource || details.source || "—"}</strong>
              </div>
              <div>
                <span>Stage</span>
                <strong>{details.stage || details.status}</strong>
              </div>
              <div>
                <span>Assigned to</span>
                <strong>{details.assignedName}</strong>
              </div>
            </div>
            <div className="lead-detail-notes company-person-details">
              <span>Company person details</span>
              {details.companyPersons?.length ? details.companyPersons.map((person, index) => <div className="company-person-detail" key={index}><strong>{person.name || "Unnamed person"}</strong><small>{person.email || "No email"} · {person.contactNumber || "No contact"} · {person.designation || "No designation"} · {person.department || "No department"}</small></div>) : <p>No company persons added.</p>}
            </div>
            <div className="lead-detail-notes">
              <span>Notes</span>
              <p>{details.notes || "No notes added."}</p>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog?.mode === "followups" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <div className="followup-modal">
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Activity timeline</span>
                <h2>Follow-up history</h2>
                <p>{dialog.lead.name}</p>
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
            <div className="followup-list">
              {followUps.map((item, index) => (
                <article className="followup-item" key={item._id || index}>
                  <span className="followup-dot" />
                  <div>
                    <strong>
                      {item.date ? formatDisplayDate(item.date) : "No date"}
                    </strong>
                    <p>{item.description || "No description"}</p>
                    <small>
                      Next follow-up:{" "}
                      {item.nextDate
                        ? formatDisplayDate(item.nextDate)
                        : "Not scheduled"}
                    </small>
                  </div>
                  <div className="followup-actions">
                    <button
                      className="icon-action edit"
                      type="button"
                      title="Edit follow-up"
                      onClick={() => openFollowupEdit(dialog.lead, item)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="icon-action delete"
                      type="button"
                      title="Delete follow-up"
                      onClick={() =>
                        setFollowUpDialog({
                          mode: "delete",
                          lead: dialog.lead,
                          item,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!followUps.length && (
              <p className="followup-empty">
                No follow-up activity has been added yet.
              </p>
            )}
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => openFollowupCreate(dialog.lead)}
              >
                <Plus size={15} />
                Add follow-up
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {followUpDialog?.mode !== "delete" && followUpDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeFollowUpEditor()
          }
        >
          <form
            className="user-modal followup-form-modal"
            onSubmit={submitFollowup}
          >
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Activity update</span>
                <h2>
                  {followUpDialog.mode === "create"
                    ? "Add follow-up"
                    : "Edit follow-up"}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={closeFollowUpEditor}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                Activity date
                <div className="date-picker">
                  <input
                    required
                    type="date"
                    value={followUpForm.date}
                    onChange={(event) =>
                      setFollowUpForm({
                        ...followUpForm,
                        date: event.target.value,
                      })
                    }
                  />
                </div>
              </label>
              <label className="full-field">
                <span className="followup-description-heading">
                  <span>Description</span>
                  <button
                    className={`voice-typing-button${isVoiceTyping ? " active" : ""}`}
                    type="button"
                    aria-pressed={isVoiceTyping}
                    onClick={toggleVoiceTyping}
                  >
                    {isVoiceTyping ? <MicOff size={15} /> : <Mic size={15} />}
                    {isVoiceTyping ? "Stop voice" : "Voice type"}
                  </button>
                </span>
                <textarea
                  required
                  value={followUpForm.description}
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe the call, meeting, or next action"
                  rows="4"
                />
                <small className={`voice-typing-hint${isVoiceTyping ? " active" : ""}`}>
                  {isVoiceTyping
                    ? "Listening… Speak clearly; your words will appear here."
                    : "Use your microphone to dictate the follow-up description."}
                </small>
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={closeFollowUpEditor}
              >
                Cancel
              </button>
              <button className="primary-action" type="submit">
                Save follow-up
              </button>
            </div>
          </form>
        </div>
      )}
      {followUpDialog?.mode === "delete" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setFollowUpDialog(null)
          }
        >
          <div className="confirm-modal">
            <div className="confirm-icon">
              <Trash2 size={20} />
            </div>
            <h2>Delete follow-up?</h2>
            <p>This activity will be permanently removed.</p>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setFollowUpDialog(null)}
              >
                Cancel
              </button>
              <button
                className="danger-action"
                type="button"
                onClick={deleteFollowup}
              >
                Delete follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function LegacyAssigneeDropdown({ users, value, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const selected = users.find((user) => user._id === value);
  const selectUser = (user) => {
    onChange(user._id);
    setOpen(false);
  };
  return (
    <div
      ref={dropdownRef}
      className={`assignee-dropdown${open ? " open" : ""}${disabled ? " disabled" : ""}`}
    >
      <button
        className="assignee-select"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="assignee-avatar">
          {selected?.name?.slice(0, 1).toUpperCase() || "?"}
        </span>
        <span className="assignee-copy">
          <strong>{selected?.name || "Select a user"}</strong>
          <small>{selected?.roleLabel || "Choose who owns this lead"}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="assignee-options"
          role="listbox"
          aria-label="Select assigned user"
        >
          {users.length ? (
            users.map((user) => (
              <button
                className={user._id === value ? "selected" : ""}
                type="button"
                role="option"
                aria-selected={user._id === value}
                key={user._id}
                onClick={() => selectUser(user)}
              >
                <span className="assignee-avatar">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="assignee-copy">
                  <strong>{user.name}</strong>
                  <small>{user.roleLabel}</small>
                </span>
                {user._id === value && (
                  <span className="assignee-check">
                    ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="assignee-empty">No users available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LegacyLeadDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const selected = options.find((option) => option === value) || options[0];
  return (
    <div ref={dropdownRef} className={`lead-dropdown${open ? " open" : ""}`}>
      <button
        className="lead-select"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{selected}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="lead-options" role="listbox">
          {options.map((option) => (
            <button
              className={option === value ? "selected" : ""}
              type="button"
              role="option"
              aria-selected={option === value}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
              {option === value && (
                <span>
                  ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyDashboardOverview({ data, session }) {
  return (
    <div className="crm-content-inner dashboard-overview">
      <section className="welcome-panel">
        <div>
          <span className="dashboard-kicker">Today at JB Corporation</span>
          <h1>Good to see you, {session.user.name.split(" ")[0]}.</h1>
          <p>
            Manage customer relationships, enquiries, quotations, and follow-ups
            from one workspace.
          </p>
        </div>
        <div className="welcome-mark">JB</div>
      </section>
      <section className="dashboard-metrics" aria-label="CRM summary metrics">
        {(
          data?.metrics || [
            {
              label: "Loading",
              value:
                "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦",
            },
          ]
        ).map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>CRM module</small>
          </article>
        ))}
      </section>
      <section className="dashboard-empty">
        <div className="empty-icon">
          ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹
        </div>
        <div>
          <span className="dashboard-kicker">Workspace modules</span>
          <h2>Your CRM workspace is ready</h2>
          <p>
            Customer, product, enquiry, quotation, and follow-up modules can be
            connected here.
          </p>
        </div>
        <button type="button">Explore modules</button>
      </section>
    </div>
  );
}

function RoleDropdown({ value, onChange }) {
  return (
    <Select
      className="antd-crm-select"
      placement="topLeft"
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      onChange={onChange}
      options={[
        { value: 2, label: "User", detail: "Standard CRM access" },
        { value: 1, label: "Admin", detail: "Full CRM access" },
      ]}
      optionRender={(option) => (
        <span className="antd-option-rich">
          <b>{option.data.label.slice(0, 1)}</b>
          <span>
            <strong>{option.data.label}</strong>
            <small>{option.data.detail}</small>
          </span>
        </span>
      )}
    />
  );
}

function AssigneeDropdown({ users, value, disabled, onChange }) {
  return (
    <Select
      className="antd-crm-select antd-assignee-select"
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      disabled={disabled}
      placeholder="Select a user"
      onChange={onChange}
      options={users.map((user) => ({
        value: user._id,
        label: `${user.name} · ${user.roleLabel}`,
      }))}
    />
  );
}

function LeadDropdown({ value, options, placeholder, onChange, showStatusIndicator = true, disabled = false, manageLabel, onManage }) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      className="antd-crm-select antd-lead-select"
      placement="topLeft"
      autoAdjustOverflow={false}
      value={value || undefined}
      placeholder={placeholder}
      showSearch
      optionFilterProp="label"
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      onChange={onChange}
      options={options.map((option) => ({ value: option, label: option }))}
      labelRender={(option) => (
        <span
          className={`antd-selected-status status-${String(option.value).toLowerCase().replace(/\s/g, "-")}`}
        >
          {showStatusIndicator && <i />}
          {option.label}
        </span>
      )}
      optionRender={(option) => (
        <span
          className={`antd-status-option status-${String(option.data.value).toLowerCase().replace(/\s/g, "-")}`}
        >
          {showStatusIndicator && <i />}
          {option.data.label}
        </span>
      )}
      popupRender={(menu) => (
        <>
          {menu}
          {onManage && (
            <>
              <div className="dropdown-management-divider" />
              <button
                className="dropdown-management-action"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
              >
                <Plus size={14} />
                {manageLabel || "Manage values"}
              </button>
            </>
          )}
        </>
      )}
    />
  );
}

function AntDatePicker({ value, onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
  }, []);
  return (
    <span ref={pickerRef} className="antd-date-picker-wrap">
      <DatePicker
        className="antd-crm-date"
        open={open}
        value={value ? dayjs(value) : null}
        onOpenChange={setOpen}
        onChange={(date) => {
          onChange(date ? date.format("YYYY-MM-DD") : "");
          setOpen(false);
        }}
        getPopupContainer={(trigger) => trigger.parentElement}
        format="DD/MM/YYYY"
        required={required}
      />
    </span>
  );
}

function DashboardOverview({ leads = [], session }) {
  const [dashboardLeads, setDashboardLeads] = useState(leads);
  useEffect(() => {
    api
      .leads(session.token)
      .then((response) => setDashboardLeads(response.leads || []))
      .catch(() => setDashboardLeads([]));
  }, [session.token]);
  leads = dashboardLeads;
  const [range, setRange] = useState("all");
  const filteredLeads = useMemo(() => {
    if (range === "all") return leads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return leads.filter((lead) => new Date(lead.createdAt) >= cutoff);
  }, [leads, range]);
  const statusCounts = ["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"].map(
    (status) => ({
      status,
      count: filteredLeads.filter((lead) => lead.status === status).length,
    }),
  );
  const sourceCounts = [
    ...new Set(filteredLeads.map((lead) => lead.source || "Other")),
  ]
    .map((source) => ({
      source,
      count: filteredLeads.filter((lead) => (lead.source || "Other") === source)
        .length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxStatus = Math.max(...statusCounts.map((item) => item.count), 1);
  const maxSource = Math.max(...sourceCounts.map((item) => item.count), 1);
  const followUps = filteredLeads.filter(
    (lead) => lead.nextFollowUp || lead.followUps?.length,
  ).length;
  const conversion = filteredLeads.length
    ? Math.round(
        (filteredLeads.filter((lead) => lead.status === "Done").length /
          filteredLeads.length) *
          100,
      )
    : 0;
  useEffect(() => {
    const select = document.querySelector(".range-filter select");
    if (!select) return undefined;
    select.dataset.customized = "true";
    select.style.display = "none";
    const wrapper = document.createElement("div");
    wrapper.className = "range-custom-dropdown";
    const button = document.createElement("button");
    button.className = "range-custom-button";
    button.type = "button";
    button.innerHTML = `<span>${select.options[select.selectedIndex].text}</span><span class="range-custom-chevron">⌄</span>`;
    const menu = document.createElement("div");
    menu.className = "range-custom-options";
    [...select.options].forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = option.value === select.value ? "selected" : "";
      item.textContent = option.textContent;
      item.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        button.querySelector("span").textContent = option.textContent;
        menu
          .querySelectorAll("button")
          .forEach((entry) => entry.classList.remove("selected"));
        item.classList.add("selected");
        wrapper.classList.remove("open");
      });
      menu.append(item);
    });
    button.addEventListener("click", () => wrapper.classList.toggle("open"));
    wrapper.append(button, menu);
    select.parentElement.append(wrapper);
    const close = (event) => {
      if (!wrapper.contains(event.target)) wrapper.classList.remove("open");
    };
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      wrapper.remove();
    };
  }, []);
  useEffect(() => {
    const mount = document.querySelector(".range-custom-dropdown");
    if (!mount) return undefined;
    const root = createRoot(mount);
    root.render(
      <Select
        className="antd-range-select"
        showSearch
        optionFilterProp="label"
        value={range}
        onChange={setRange}
        options={[
          { value: "all", label: "All time" },
          { value: "30", label: "Last 30 days" },
          { value: "7", label: "Last 7 days" },
        ]}
      />,
    );
    return () => root.unmount();
  }, [range]);

  return (
    <div className="crm-content-inner analytics-dashboard">
      <div className="analytics-heading">
        <div>
          <span className="dashboard-kicker">Performance overview</span>
          <h1>Good to see you, {session.user.name.split(" ")[0]}.</h1>
          <p>Monitor your pipeline health and team activity from one place.</p>
        </div>
        <label className="range-filter">
          <span>Period</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="all">All time</option>
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
          </select>
        </label>
      </div>
      <div className="analytics-kpis">
        <article>
          <span>Total leads</span>
          <strong>{filteredLeads.length}</strong>
          <small>Visible in your workspace</small>
        </article>
        <article>
          <span>Open pipeline</span>
          <strong>
            {
              filteredLeads.filter(
                (lead) => !["Done", "Lost"].includes(lead.status),
              ).length
            }
          </strong>
          <small>New, contacted, or qualified</small>
        </article>
        <article>
          <span>Follow-ups</span>
          <strong>{followUps}</strong>
          <small>Leads with activity scheduled</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{conversion}%</strong>
          <small>Moved to done</small>
        </article>
      </div>
      <div className="analytics-grid">
        <section className="analytics-card status-chart">
          <div className="analytics-card-heading">
            <div>
              <span className="dashboard-kicker">Pipeline</span>
              <h2>Lead stage</h2>
            </div>
            <span className="chart-total">{filteredLeads.length} total</span>
          </div>
          <div className="bar-chart">
            {statusCounts.map((item) => (
              <div className="bar-row" key={item.status}>
                <span>{item.status}</span>
                <div className="bar-track">
                  <i style={{ width: `${(item.count / maxStatus) * 100}%` }} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="analytics-card source-chart">
          <div className="analytics-card-heading">
            <div>
              <span className="dashboard-kicker">Acquisition</span>
              <h2>Lead sources</h2>
            </div>
            <span className="chart-total">Top sources</span>
          </div>
          {sourceCounts.length ? (
            <div className="source-list">
              {sourceCounts.map((item) => (
                <div className="source-row" key={item.source}>
                  <div>
                    <span>{item.source}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="source-track">
                    <i
                      style={{ width: `${(item.count / maxSource) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty">No lead data for this period.</p>
          )}
        </section>
      </div>
      <section className="analytics-card activity-card">
        <div className="analytics-card-heading">
          <div>
            <span className="dashboard-kicker">Recent activity</span>
            <h2>Latest leads</h2>
          </div>
          <button
            className="text-action"
            type="button"
            onClick={() => navigate("/leads")}
          >
            View all leads
          </button>
        </div>
        {filteredLeads.length ? (
          <div className="activity-list">
            {filteredLeads.slice(0, 5).map((lead) => (
              <div className="activity-row" key={lead._id}>
                <div className="activity-status" />
                <div>
                  <strong>{lead.name}</strong>
                  <span>
                    {lead.city || lead.company || "No city"} · {lead.status}
                  </span>
                </div>
                <time>{formatDisplayDate(lead.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="analytics-empty">
            Create your first lead to see activity here.
          </p>
        )}
      </section>
    </div>
  );
}

export default CrmWorkspace;
