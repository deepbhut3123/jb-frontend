import {
  ContactRound,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
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
  collapsed,
  onNavigate,
  onLogout,
}) {
  return (
    <aside className="crm-sidebar">
      <div className="crm-brand">
        <img src={collapsed ? icon : logo} alt="JB Corporation" />
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
              {item.label}
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
            Products
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
            Categories
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
            User Management
          </button>
        )}
      </nav>
      {isAdmin && <nav className="crm-navigation crm-integrations-navigation" aria-label="Integrations"><button className={activeSection === 'whatsapp' ? 'active' : ''} data-tooltip="Integrations" type="button" onClick={() => onNavigate('whatsapp')}><MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />Integrations</button></nav>}
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
