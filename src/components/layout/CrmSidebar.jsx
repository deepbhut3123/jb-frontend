import {
  ContactRound,
  ClipboardList,
  FileText,
  BarChart3,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
  Settings,
  UsersRound,
} from "lucide-react";
import { canView } from "../../utils/permissions.js";
import icon from "../../assets/jb-corporation-icon.png";
import logo from "../../assets/jb-corporation-logo.png";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: ContactRound, label: "Leads", key: "leads" },
  { icon: UsersRound, label: "Customers", key: "customers" },
  { icon: FileText, label: "Quotations", key: "quotations" },
  { icon: ClipboardList, label: "Sales Orders", key: "salesOrders" },
  { icon: Package, label: "Products", key: "products" },
  { icon: BarChart3, label: "Reports", key: "reports" },
  { icon: FolderTree, label: "Categories", key: "categories" },
  { icon: Settings, label: "Settings", key: "settings" },
  { icon: UserRound, label: "User Management", key: "users" },
  { icon: ShieldCheck, label: "Roles & Permissions", key: "roles", adminOnly: true },
  { icon: MessageCircle, label: "Integrations", key: "whatsapp", adminOnly: true },
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
  function handleFocus(event) {
    const previousElement = event.relatedTarget;
    if (previousElement && !event.currentTarget.contains(previousElement)) onExpand();
  }

  return (
    <aside className="crm-sidebar" onMouseMove={onExpand} onMouseLeave={onCollapse} onFocus={handleFocus} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onCollapse(); }}>
      <div className="crm-brand">
        <img className="crm-brand-full" src={logo} alt="JB Corporation" />
        <img className="crm-brand-icon" src={icon} alt="" aria-hidden="true" />
      </div>
      <nav className="crm-navigation" aria-label="CRM navigation">
        {navigationItems.filter((item) => item.adminOnly ? isAdmin : canView(session.user, item.key)).map((item) => {
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
      </nav>
      <div className="sidebar-user">
        <button className={`sidebar-profile-link${activeSection === "profile" ? " active" : ""}`} data-tooltip="Profile" type="button" onClick={() => onNavigate("profile")}>
          <span className="user-avatar">{session.user.name.slice(0, 1).toUpperCase()}</span>
          <span className="sidebar-profile-copy">
            <strong>{session.user.name}</strong>
            <span>{isAdmin ? "Administrator" : "CRM user"}</span>
          </span>
        </button>
        <button className="sidebar-signout" type="button" onClick={onLogout}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default CrmSidebar;
