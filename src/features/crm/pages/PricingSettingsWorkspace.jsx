import { Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';

const defaults = { dollarRate: 1, multiplier: 1 };
export default function PricingSettingsWorkspace({ token }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.pricingSettings(token).then((response) => setForm(response.settings || defaults)).catch((error) => toast.error(error.message)); }, [token]);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { const response = await api.savePricingSettings(token, form); setForm(response.settings); toast.success('Pricing settings saved.'); }
    catch (error) { toast.error(error.message); } finally { setSaving(false); }
  }
  return <div className="crm-content-inner pricing-settings-page"><div className="section-heading"><div><span className="dashboard-kicker"><Settings size={15} /> Administration</span><h1>Pricing settings</h1><p>Manage the shared conversion values used when calculating product rates.</p></div></div><form className="pricing-settings-card" onSubmit={save}><div className="pricing-settings-header"><div><h2>Conversion rules</h2><p>These values apply to every product. Margin is configured separately on each product.</p></div><Settings size={30} aria-hidden="true" /></div><div className="pricing-settings-grid"><label><span>Dollar rate</span><small>Indian rupees per US dollar</small><div className="pricing-input"><span>₹</span><input required min="0.0001" step="any" inputMode="decimal" type="number" value={form.dollarRate} onChange={(event) => setForm({ ...form, dollarRate: event.target.value })} /></div></label><label><span>Multiply amount</span><small>Final pricing multiplier</small><div className="pricing-input"><span>×</span><input required min="0.0001" step="any" inputMode="decimal" type="number" value={form.multiplier} onChange={(event) => setForm({ ...form, multiplier: event.target.value })} /></div></label></div><div className="pricing-formula"><strong>Calculation</strong><span>Final rate = Dollar amount × Dollar rate × (1 + product margin %) × Multiply amount</span></div><div className="pricing-settings-actions"><button className="primary-action" disabled={saving} type="submit"><Save size={16} />{saving ? 'Saving…' : 'Save settings'}</button></div></form></div>;
}
