import { Mail, Save, Send, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getSession } from '../../../services/api.js';
import { can } from '../../../utils/permissions.js';

const pricingDefaults = { dollarRate: 1, multiplier: 1 };
const smtpDefaults = { host: '', port: 587, secure: false, username: '', from: '', password: '' };

export default function PricingSettingsWorkspace({ token }) {
  const canEdit = can(getSession()?.user, 'settings.edit');
  const [pricing, setPricing] = useState(pricingDefaults);
  const [savingPricing, setSavingPricing] = useState(false);
  const pricingSavingRef = useRef(false);
  const [smtp, setSmtp] = useState(smtpDefaults);
  const [smtpSource, setSmtpSource] = useState('environment');
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState(getSession()?.user?.email || '');

  useEffect(() => {
    api.pricingSettings(token).then((response) => setPricing(response.settings || pricingDefaults)).catch((error) => toast.error(error.message));
    api.smtpSettings(token).then((response) => {
      setSmtp({ ...smtpDefaults, ...response.settings, password: '' });
      setSmtpSource(response.source || 'environment');
      setSmtpPasswordConfigured(Boolean(response.settings?.passwordConfigured));
    }).catch((error) => toast.error(error.message));
  }, [token]);

  async function savePricing(event) {
    event.preventDefault();
    if (pricingSavingRef.current) return;
    pricingSavingRef.current = true;
    setSavingPricing(true);
    try {
      const response = await api.savePricingSettings(token, pricing);
      setPricing(response.settings);
      toast.success('Pricing settings saved.');
    } catch (error) { toast.error(error.message); }
    finally { pricingSavingRef.current = false; setSavingPricing(false); }
  }

  async function saveSmtp(event) {
    event.preventDefault();
    if (!canEdit || savingSmtp) return;
    setSavingSmtp(true);
    try {
      const response = await api.saveSmtpSettings(token, smtp);
      setSmtp({ ...smtpDefaults, ...response.settings, password: '' });
      setSmtpSource(response.source || 'settings');
      setSmtpPasswordConfigured(Boolean(response.settings?.passwordConfigured));
      toast.success(response.message || 'SMTP settings saved.');
    } catch (error) { toast.error(error.message); }
    finally { setSavingSmtp(false); }
  }

  async function sendTestEmail() {
    setTestingSmtp(true);
    try { const response = await api.testSmtpSettings(token, testEmail); toast.success(response.message); }
    catch (error) { toast.error(error.message); }
    finally { setTestingSmtp(false); }
  }

  return <div className="crm-content-inner pricing-settings-page">
    <div className="section-heading"><div><span className="dashboard-kicker"><Settings size={15} /> Administration</span><h1>Settings</h1><p>Manage product pricing and outgoing email configuration.</p></div></div>

    <form className="pricing-settings-card" onSubmit={savePricing}>
      <div className="pricing-settings-header"><div><h2>Conversion rules</h2><p>These values apply to every product. Margin is configured separately on each product.</p></div><Settings size={30} aria-hidden="true" /></div>
      <div className="pricing-settings-grid">
        <label><span>Dollar rate</span><small>Indian rupees per US dollar</small><div className="pricing-input"><span>INR</span><input required readOnly={!canEdit} min="0.0001" step="any" inputMode="decimal" type="number" value={pricing.dollarRate} onChange={(event) => setPricing({ ...pricing, dollarRate: event.target.value })} /></div></label>
        <label><span>Multiply amount</span><small>Final pricing multiplier</small><div className="pricing-input"><span>x</span><input required readOnly={!canEdit} min="0.0001" step="any" inputMode="decimal" type="number" value={pricing.multiplier} onChange={(event) => setPricing({ ...pricing, multiplier: event.target.value })} /></div></label>
      </div>
      <div className="pricing-formula"><strong>Calculation</strong><span>Final rate = Dollar amount x Dollar rate x (1 + product margin %) x Multiply amount</span></div>
      {canEdit && <div className="pricing-settings-actions"><button className="primary-action" disabled={savingPricing} type="submit"><Save size={16} />{savingPricing ? 'Saving...' : 'Save settings'}</button></div>}
    </form>

    <form className="pricing-settings-card smtp-settings-card" onSubmit={saveSmtp}>
      <div className="pricing-settings-header"><div><h2>SMTP email settings</h2><p>Configure the email server used for account verification and password recovery.</p></div><Mail size={30} aria-hidden="true" /></div>
      <div className="smtp-source-note">Currently using <strong>{smtpSource === 'settings' ? 'saved settings' : 'environment variables'}</strong>. Saved settings take priority; SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and SMTP_FROM are used as the fallback.</div>
      <div className="pricing-settings-grid smtp-settings-grid">
        <label><span>SMTP host</span><input required readOnly={!canEdit} maxLength={255} value={smtp.host} onChange={(event) => setSmtp({ ...smtp, host: event.target.value })} placeholder="smtp.example.com" /></label>
        <label><span>Port</span><input required readOnly={!canEdit} type="number" min="1" max="65535" value={smtp.port} onChange={(event) => setSmtp({ ...smtp, port: event.target.value })} placeholder="587" /></label>
        <label><span>Username</span><input required readOnly={!canEdit} autoComplete="off" maxLength={255} value={smtp.username} onChange={(event) => setSmtp({ ...smtp, username: event.target.value })} placeholder="Email account username" /></label>
        <label><span>Sender email</span><input required readOnly={!canEdit} maxLength={255} value={smtp.from} onChange={(event) => setSmtp({ ...smtp, from: event.target.value })} placeholder="Company name <noreply@example.com>" /></label>
        <label className="smtp-password-field"><span>SMTP password</span><input readOnly={!canEdit} type="password" autoComplete="new-password" value={smtp.password} onChange={(event) => setSmtp({ ...smtp, password: event.target.value })} placeholder={smtpPasswordConfigured ? 'Saved password is protected; leave blank to keep it' : 'Enter SMTP password'} />{smtpPasswordConfigured && <small>Password is configured and never shown here.</small>}</label>
        <label className="smtp-secure-toggle"><span><input type="checkbox" disabled={!canEdit} checked={Boolean(smtp.secure)} onChange={(event) => setSmtp({ ...smtp, secure: event.target.checked })} />Use secure TLS connection</span><small>Enable for providers that require implicit TLS, usually port 465.</small></label>
      </div>
      {canEdit && <div className="pricing-settings-actions smtp-settings-actions"><button className="primary-action" disabled={savingSmtp} type="submit"><Save size={16} />{savingSmtp ? 'Saving...' : 'Save SMTP settings'}</button></div>}
      <div className="smtp-test-panel"><div className="smtp-test-heading"><div><h3>Send a test email</h3><p>Save settings first, then confirm the server can deliver messages.</p></div><Send size={20} aria-hidden="true" /></div><div className="smtp-test-row"><label><span>Test recipient email</span><input required type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" /></label><button className="primary-action" type="button" disabled={!canEdit || testingSmtp || !testEmail} onClick={sendTestEmail}><Send size={16} />{testingSmtp ? 'Sending...' : 'Send test email'}</button></div></div>
    </form>
  </div>;
}
