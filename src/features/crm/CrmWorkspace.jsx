import { useEffect, useRef, useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import CategoryMasterPanel from '../../components/CategoryMasterPanel.jsx';
import CrmSidebar from '../../components/layout/CrmSidebar.jsx';
import ProductMasterPanel from '../../components/ProductMasterPanel.jsx';
import ModuleLoading from '../../components/ModuleLoading.jsx';
import { api, clearSession, getSession } from '../../services/api.js';
import { navigate } from '../../utils/navigation.js';
import DashboardOverview from './pages/DashboardWorkspace.jsx';
import LeadsPanel from './pages/LeadsWorkspace.jsx';
import QuotationsPanel from './pages/QuotationsWorkspace.jsx';
import UsersPanel from './pages/UsersWorkspace.jsx';
import WhatsAppWorkspace from './pages/WhatsAppWorkspace.jsx';

const routePaths = { dashboard: '/dashboard', leads: '/leads', quotations: '/quotations', categories: '/categories', products: '/products', users: '/users', whatsapp: '/whatsapp' };

function CrmWorkspace({ section = 'dashboard' }) {
  const session = getSession();
  const isAdmin = [1, 3].includes(session.user.role);
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [leadOptions, setLeadOptions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 900);
  const mobileLayoutRef = useRef(window.innerWidth <= 900);

  useEffect(() => {
    function updateSidebarForViewport() {
      const isMobileLayout = window.innerWidth <= 900;
      if (isMobileLayout !== mobileLayoutRef.current) { mobileLayoutRef.current = isMobileLayout; setSidebarCollapsed(isMobileLayout); }
    }
    window.addEventListener('resize', updateSidebarForViewport);
    return () => window.removeEventListener('resize', updateSidebarForViewport);
  }, []);

  useEffect(() => {
    api.dashboard(session.token).then(setData).catch(() => { toast.error('Your session has expired. Please log in again.'); clearSession(); navigate('/login'); });
  }, [session.token]);
  useEffect(() => {
    if (!['users', 'leads'].includes(section) || !isAdmin) return;
    api.users(session.token).then((response) => setUsers(response.users || [])).catch((error) => toast.error(error.message));
  }, [isAdmin, section, session.token]);
  useEffect(() => {
    if (!['products', 'categories'].includes(section)) return;
    api.categories(session.token).then((response) => setCategories(response.categories || [])).catch((error) => toast.error(error.message));
  }, [section, session.token]);
  useEffect(() => {
    if (section !== 'leads') return;
    api.leadOptions(session.token).then((response) => setLeadOptions(response.options || [])).catch((error) => toast.error(error.message));
  }, [section, session.token]);
  useEffect(() => {
    if (section !== 'quotations') return;
    api.quotations(session.token).then((response) => setQuotations(response.quotations || [])).catch((error) => toast.error(error.message));
  }, [section, session.token]);
  useEffect(() => {
    if (!['products', 'quotations'].includes(section)) return;
    api.products(session.token).then((response) => setProducts(response.products || [])).catch((error) => toast.error(error.message));
  }, [isAdmin, section, session.token]);

  function logout() { clearSession(); toast.success('You have been signed out.'); navigate('/login'); }
  function selectSection(nextSection) { if (window.innerWidth <= 900) setSidebarCollapsed(true); navigate(routePaths[nextSection] || routePaths.dashboard); }

  return <main className={`crm-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <CrmSidebar activeSection={section} isAdmin={isAdmin} session={session} collapsed={sidebarCollapsed} onNavigate={selectSection} onLogout={logout} />
    <button className="mobile-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarCollapsed(true)} />
    <section className="crm-workspace">
      <header className="crm-header"><div className="header-title"><button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((current) => !current)}><Menu size={18} strokeWidth={1.8} /></button><div><h2>Internal CRM</h2></div></div><div className="header-role"><ShieldCheck size={16} /><span>{isAdmin ? 'Admin' : 'User'}</span></div></header>
      <div className="crm-content">
        <ModuleLoading key={section} section={section} token={session.token}>
        {section === 'whatsapp' ? <WhatsAppWorkspace token={session.token} />
          : section === 'users' ? <UsersPanel users={users} setUsers={setUsers} token={session.token} />
          : section === 'leads' ? <LeadsPanel leads={leads} setLeads={setLeads} isAdmin={isAdmin} users={users} token={session.token} currentUser={session.user} leadOptions={leadOptions} setLeadOptions={setLeadOptions} />
            : section === 'products' ? <ProductMasterPanel products={products} setProducts={setProducts} categories={categories} token={session.token} />
              : section === 'categories' ? <CategoryMasterPanel categories={categories} setCategories={setCategories} token={session.token} />
                : section === 'quotations' ? <QuotationsPanel quotations={quotations} setQuotations={setQuotations} token={session.token} isAdmin={isAdmin} products={products} />
                  : <DashboardOverview data={data} session={session} />}
        </ModuleLoading>
      </div>
    </section>
  </main>;
}

export default CrmWorkspace;
