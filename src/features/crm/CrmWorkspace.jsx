import { useEffect, useRef, useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import CategoryMasterPanel from '../../components/CategoryMasterPanel.jsx';
import CrmSidebar from '../../components/layout/CrmSidebar.jsx';
import ProductMasterPanel from '../../components/ProductMasterPanel.jsx';
import ModuleLoading from '../../components/ModuleLoading.jsx';
import GlobalSearch from '../../components/GlobalSearch.jsx';
import { api, clearSession, getSession } from '../../services/api.js';
import { navigate } from '../../utils/navigation.js';
import DashboardOverview from './pages/DashboardWorkspace.jsx';
import LeadsPanel from './pages/LeadsWorkspace.jsx';
import QuotationsPanel from './pages/QuotationsWorkspace.jsx';
import UsersPanel from './pages/UsersWorkspace.jsx';
import WhatsAppWorkspace from './pages/WhatsAppWorkspace.jsx';
import PricingSettingsWorkspace from './pages/PricingSettingsWorkspace.jsx';
import CustomersWorkspace from './pages/CustomersWorkspace.jsx';

const routePaths = { dashboard: '/dashboard', leads: '/leads', quotations: '/quotations', categories: '/categories', products: '/products', users: '/users', whatsapp: '/whatsapp', settings: '/settings', customers: '/customers' };

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
  const [contentVersion, setContentVersion] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const mobileLayoutRef = useRef(window.innerWidth <= 900);
  const sidebarCollapseTimerRef = useRef(null);

  useEffect(() => {
    function updateSidebarForViewport() {
      const isMobileLayout = window.innerWidth <= 900;
      if (isMobileLayout !== mobileLayoutRef.current) { mobileLayoutRef.current = isMobileLayout; setSidebarCollapsed(true); }
    }
    window.addEventListener('resize', updateSidebarForViewport);
    return () => window.removeEventListener('resize', updateSidebarForViewport);
  }, []);

  useEffect(() => () => window.clearTimeout(sidebarCollapseTimerRef.current), []);

  useEffect(() => {
    api.dashboard(session.token).then(setData).catch(() => { toast.error('Your session has expired. Please log in again.'); clearSession(); navigate('/login'); });
  }, [session.token]);
  useEffect(() => {
    if (!['users', 'leads'].includes(section) || !isAdmin) return;
    const lookup = new URLSearchParams(window.location.search).get('lookup') || '';
    api.users(session.token, section === 'leads' ? { limit: 100 } : { page: 1, limit: 10, search: lookup }).then((response) => setUsers(response.users || [])).catch((error) => toast.error(error.message));
  }, [contentVersion, isAdmin, section, session.token]);
  useEffect(() => {
    if (!['products', 'categories'].includes(section)) return;
    api.categories(session.token).then((response) => setCategories(response.categories || [])).catch((error) => toast.error(error.message));
  }, [section, session.token]);
  useEffect(() => {
    if (section !== 'leads') return;
    api.leadOptions(session.token).then((response) => setLeadOptions(response.options || [])).catch((error) => toast.error(error.message));
  }, [section, session.token]);
  useEffect(() => {
    if (!['quotations', 'customers'].includes(section)) return;
    const lookup = section === 'customers' ? new URLSearchParams(window.location.search).get('lookup') || '' : '';
    api.leads(session.token, { limit: 100, search: lookup }).then((response) => setLeads(response.leads || [])).catch((error) => toast.error(error.message));
  }, [contentVersion, section, session.token]);
  useEffect(() => {
    if (!['products', 'quotations'].includes(section)) return;
    const lookup = section === 'products' ? new URLSearchParams(window.location.search).get('lookup') || '' : '';
    api.products(session.token, section === 'quotations' ? { limit: 1000 } : { page: 1, limit: 10, search: lookup }).then((response) => setProducts(response.products || [])).catch((error) => toast.error(error.message));
  }, [contentVersion, isAdmin, section, session.token]);

  useEffect(() => {
    const recordId = new URLSearchParams(window.location.search).get('highlight');
    if (!recordId) return undefined;
    let highlightTimer;
    const findAndHighlight = () => {
      const element = document.querySelector(`[data-record-id="${CSS.escape(recordId)}"]`);
      if (!element) return false;
      element.classList.add('global-search-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      highlightTimer = window.setTimeout(() => element.classList.remove('global-search-highlight'), 5000);
      return true;
    };
    if (findAndHighlight()) return () => window.clearTimeout(highlightTimer);
    const observer = new MutationObserver(() => { if (findAndHighlight()) observer.disconnect(); });
    const content = document.querySelector('.crm-content');
    if (content) observer.observe(content, { childList: true, subtree: true });
    const stopTimer = window.setTimeout(() => observer.disconnect(), 8000);
    return () => { observer.disconnect(); window.clearTimeout(stopTimer); window.clearTimeout(highlightTimer); };
  }, [contentVersion, section]);

  function logout() { clearSession(); toast.success('You have been signed out.'); navigate('/login'); }
  function selectSection(nextSection) { if (window.innerWidth <= 900) setSidebarCollapsed(true); navigate(routePaths[nextSection] || routePaths.dashboard); }
  function expandSidebar() {
    window.clearTimeout(sidebarCollapseTimerRef.current);
    if (window.innerWidth > 900) setSidebarCollapsed(false);
  }
  function collapseSidebar() {
    window.clearTimeout(sidebarCollapseTimerRef.current);
    if (window.innerWidth > 900) sidebarCollapseTimerRef.current = window.setTimeout(() => setSidebarCollapsed(true), 120);
  }
  function openGlobalResult(result, lookup) {
    const params = new URLSearchParams({ highlight: result.id, lookup });
    if (result.leadId) params.set('leadId', result.leadId);
    navigate(`/${result.section}?${params}`);
    setContentVersion((current) => current + 1);
  }

  return <main className={`crm-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <CrmSidebar activeSection={section} isAdmin={isAdmin} session={session} onNavigate={selectSection} onLogout={logout} onExpand={expandSidebar} onCollapse={collapseSidebar} />
    <button className="mobile-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarCollapsed(true)} />
    <section className="crm-workspace">
      <header className="crm-header"><div className="header-title"><button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((current) => !current)}><Menu size={18} strokeWidth={1.8} /></button><div><h2>Internal CRM</h2></div></div>{section === 'dashboard' && <GlobalSearch token={session.token} onSelect={openGlobalResult} />}<div className="header-role"><ShieldCheck size={16} /><span>{isAdmin ? 'Admin' : 'User'}</span></div></header>
      <div className="crm-content">
        <ModuleLoading key={`${section}-${contentVersion}`} section={section} token={session.token}>
        {section === 'customers' ? <CustomersWorkspace leads={leads} setLeads={setLeads} token={session.token} />
          : section === 'settings' ? <PricingSettingsWorkspace token={session.token} />
          : section === 'whatsapp' ? <WhatsAppWorkspace token={session.token} />
          : section === 'users' ? <UsersPanel users={users} setUsers={setUsers} token={session.token} />
          : section === 'leads' ? <LeadsPanel leads={leads} setLeads={setLeads} isAdmin={isAdmin} users={users} token={session.token} currentUser={session.user} leadOptions={leadOptions} setLeadOptions={setLeadOptions} />
            : section === 'products' ? <ProductMasterPanel products={products} setProducts={setProducts} categories={categories} token={session.token} />
              : section === 'categories' ? <CategoryMasterPanel categories={categories} setCategories={setCategories} token={session.token} />
                : section === 'quotations' ? <QuotationsPanel quotations={quotations} setQuotations={setQuotations} leads={leads} token={session.token} isAdmin={isAdmin} products={products} />
                  : <DashboardOverview data={data} session={session} />}
        </ModuleLoading>
      </div>
    </section>
  </main>;
}

export default CrmWorkspace;
