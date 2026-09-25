import {
  ContactRound,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  // MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
  Settings,
  UsersRound,
} from "lucide-react";
import icon from "../../assets/jb-corporation-icon.png";
import logo from "../../assets/jb-corporation-logo.png";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: ContactRound, label: "Leads", key: "leads" },
  { icon: FileText, label: "Quotations", key: "quotations" },
];

function CrmSidebar({
  activeSection,
  isAdmin,
  session,
  onNavigate,
  onLogout,
  onExpand,
  onCollapse,
}) {
  return (
    <aside className="crm-sidebar" onMouseEnter={onExpand} onMouseLeave={onCollapse} onFocus={onExpand} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onCollapse(); }}>
      <div className="crm-brand">
        <img className="crm-brand-full" src={logo} alt="JB Corporation" />
        <img className="crm-brand-icon" src={icon} alt="" aria-hidden="true" />
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
              onClick={() => onNavigate(item.key)}
            >
              <MenuIcon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            className={activeSection === "products" ? "active" : ""}
            data-tooltip="Products"
            type="button"
            onClick={() => onNavigate("products")}
          >
            <Package aria-hidden="true" size={19} strokeWidth={1.8} />
            <span className="sidebar-label">Products</span>
          </button>
        )}
        <button className={activeSection === "customers" ? "active" : ""} data-tooltip="Customers" type="button" onClick={() => onNavigate("customers")}>
          <UsersRound aria-hidden="true" size={19} strokeWidth={1.8} /><span className="sidebar-label">Customers</span>
        </button>
        {isAdmin && (
          <button className={activeSection === "settings" ? "active" : ""} data-tooltip="Settings" type="button" onClick={() => onNavigate("settings")}>
            <Settings aria-hidden="true" size={19} strokeWidth={1.8} /><span className="sidebar-label">Settings</span>
          </button>
        )}
        {isAdmin && (
          <button
            className={activeSection === "categories" ? "active" : ""}
            data-tooltip="Categories"
            type="button"
            onClick={() => onNavigate("categories")}
          >
            <FolderTree aria-hidden="true" size={19} strokeWidth={1.8} />
            <span className="sidebar-label">Categories</span>
          </button>
        )}
        {isAdmin && (
          <button
            className={activeSection === "users" ? "active" : ""}
            data-tooltip="User Management"
            type="button"
            onClick={() => onNavigate("users")}
          >
            <UserRound aria-hidden="true" size={19} strokeWidth={1.8} />
            <span className="sidebar-label">User Management</span>
          </button>
        )}
      </nav>
      {/* {isAdmin && (
        <nav
          className="crm-navigation crm-integrations-navigation"
          aria-label="Integrations"
        >
          <button
            className={activeSection === "whatsapp" ? "active" : ""}
            data-tooltip="Integrations"
            type="button"
            onClick={() => onNavigate("whatsapp")}
          >
            <MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />
            Integrations
          </button>
        </nav>
      )} */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {session.user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{session.user.name}</strong>
          <span>{isAdmin ? "Administrator" : "CRM user"}</span>
        </div>
        <button type="button" onClick={onLogout}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default CrmSidebar;
