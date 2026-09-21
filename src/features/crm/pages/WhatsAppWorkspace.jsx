import { useEffect, useState } from 'react';
import { Select, Switch } from 'antd';
import { Check, ChevronLeft, ChevronRight, Link2, MessageSquareText, QrCode, Save, UserRoundPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';
import LoadingButton from '../../../components/LoadingButton.jsx';
import whatsappLogo from '../../../assets/whatsapp-logo.svg';

const statuses = ['New', 'Quotation', 'Followup', 'Performa-Invoice', 'Done', 'Lost'];
const matchingModes = [
  { value: 'contains', label: 'Message contains this phrase' },
  { value: 'exact', label: 'Message is exactly this text' },
  { value: 'any', label: 'Message contains any phrase' },
  { value: 'all', label: 'Message contains all phrases' },
];
const connectionLabels = { disconnected: 'Disconnected', starting: 'Starting WhatsApp', qr: 'Waiting for QR scan', authenticating: 'Connecting', connected: 'Connected', error: 'Connection error' };

function DefaultDropdown({ label, type, value, options, onChange, onAdded, token, required = false }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const choices = [...new Set([...(type === 'leadSource' ? ['WhatsApp'] : []), ...options.filter((option) => option.type === type).map((option) => option.value), ...(value ? [value] : [])])];
  async function addValue() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const result = await api.createLeadOption(token, { type, value: draft.trim() });
      onAdded(result.option);
      onChange(result.option.value);
      setAdding(false); setDraft('');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  return <div className="wa-field"><label>{label}<Select aria-label={label} className="antd-crm-select" value={value || undefined} placeholder={required ? 'Select a value' : 'No default'} allowClear={!required} showSearch optionFilterProp="label" options={choices.map((choice) => ({ value: choice, label: choice }))} onChange={(next) => onChange(next || '')} /></label>
    {adding ? <div className="wa-add-option"><input aria-label={`New ${label.toLowerCase()}`} maxLength={type === 'leadSource' ? 50 : 60} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="New dropdown value" /><LoadingButton type="button" loading={saving} disabled={!draft.trim()} onClick={addValue}>Add</LoadingButton><button className="link-button" type="button" disabled={saving} onClick={() => setAdding(false)}>Cancel</button></div> : <button className="link-button wa-add-link" type="button" onClick={() => setAdding(true)}>+ Add dropdown value</button>}
  </div>;
}

export default function WhatsAppWorkspace({ token }) {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [setupStep, setSetupStep] = useState(1);
  const [form, setForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [options, setOptions] = useState([]);
  const [connection, setConnection] = useState({ status: 'disconnected' });
  const [loadError, setLoadError] = useState('');
  const [pollError, setPollError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState('');
  const [sample, setSample] = useState('');
  const [preview, setPreview] = useState(null);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadError('');
    Promise.all([api.whatsappSettings(token), api.users(token), api.leadOptions(token)])
      .then(([settings, team, dropdowns]) => {
        if (!active) return;
        setForm(settings.settings); setUsers(team.users); setOptions(dropdowns.options); setDirty(false);
      }).catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [token, reload]);

  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const status = await api.whatsappStatus(token);
        if (active) { setConnection(status.connection); setPollError(''); }
      } catch (error) { if (active) setPollError(`Connection status could not be refreshed: ${error.message}`); }
      finally { if (active) timer = setTimeout(refresh, 4000); }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [token]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true); setPreview(null);
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await api.saveWhatsAppSettings(token, form);
      setForm(result.settings); setDirty(false); toast.success('WhatsApp settings saved.');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  async function changeConnection(nextAction) {
    if (action) return;
    setAction(nextAction);
    try {
      const result = await (nextAction === 'connect' ? api.connectWhatsApp(token) : api.disconnectWhatsApp(token));
      setConnection(result.connection);
    } catch (error) { toast.error(error.message); }
    finally { setAction(''); }
  }
  async function testMessage() {
    setTesting(true); setPreview(null);
    try {
      const result = await api.previewWhatsAppRule(token, { message: sample, matchMode: form.matchMode, matchText: form.matchText, caseSensitive: form.caseSensitive });
      setPreview(result.matches);
    } catch (error) { toast.error(error.message); }
    finally { setTesting(false); }
  }
  const starting = ['starting', 'authenticating'].includes(connection.status);
  const awaitingScan = connection.status === 'qr';
  const connected = connection.status === 'connected';
  const leadSetupReady = Boolean(form?.assignedTo && form?.status && form?.source);
  const messageRuleReady = Boolean(form?.matchText?.trim());
  const setupSteps = [
    { number: 1, label: 'Connection', icon: Link2, complete: connected },
    { number: 2, label: 'New lead setup', icon: UserRoundPlus, complete: leadSetupReady },
    { number: 3, label: 'Message rules', icon: MessageSquareText, complete: messageRuleReady },
  ];

  return <div className="crm-content-inner wa-settings">
    <div className="integration-header-row">
      <div className="section-heading"><div><h1>Integrations</h1></div></div>
      <div className="integration-tabs" role="tablist" aria-label="Integration channels">
        <button id="whatsapp-tab" className={activeTab === 'whatsapp' ? 'active' : ''} type="button" role="tab" aria-controls="whatsapp-panel" aria-selected={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')}><img className="integration-whatsapp-logo" src={whatsappLogo} alt="" />WhatsApp</button>
        <button id="indiamart-tab" className={activeTab === 'indiamart' ? 'active' : ''} type="button" role="tab" aria-controls="indiamart-panel" aria-selected={activeTab === 'indiamart'} onClick={() => setActiveTab('indiamart')}><span className="integration-tab-mark">IM</span>IndiaMART</button>
      </div>
    </div>
    {activeTab === 'indiamart' ? <section id="indiamart-panel" aria-labelledby="indiamart-tab" className="wa-card integration-placeholder" role="tabpanel"><div className="integration-placeholder-icon">IM</div><h2>IndiaMART integration</h2><p>Connect IndiaMART to receive enquiries as leads.</p><span className="integration-coming-soon">Coming soon</span></section> :
    <form id="whatsapp-panel" aria-labelledby="whatsapp-tab" className="wa-workspace" role="tabpanel" onSubmit={save}>
      <header className="wa-workspace-header">
        <div className="wa-brand-block"><span className="wa-brand-icon"><img src={whatsappLogo} alt="" /></span><div><h2>WhatsApp lead capture</h2>{connected && <span className="wa-account-number">{connection.account?.replace(/@.*$/, '')}</span>}</div></div>
        <div className="wa-header-controls"><span className={`wa-connection-badge ${connected && !pollError ? 'is-connected' : ''}`} role="status"><span />{pollError ? 'Status unavailable' : connectionLabels[connection.status] || connection.status}</span>{form && <label className={`wa-automation-switch${connected ? ' is-available' : ' is-locked'}`}><span className="wa-automation-label"><i />Lead automation</span><strong>{connected ? (form.enabled ? 'On' : 'Off') : 'Connect first'}</strong><Switch aria-label="Lead automation" checked={connected && form.enabled} onChange={(value) => update('enabled', value)} disabled={saving || testing || !connected || Boolean(pollError)} /></label>}</div>
      </header>
      <div className="wa-workspace-body">
        <nav className="wa-setup-nav" aria-label="WhatsApp setup steps">
          {setupSteps.map((step) => { const StepIcon = step.icon; return <button key={step.number} className={`${setupStep === step.number ? 'active' : ''}${step.complete ? ' complete' : ''}`} type="button" aria-current={setupStep === step.number ? 'step' : undefined} onClick={() => setSetupStep(step.number)}><span className="wa-nav-step-icon">{step.complete ? <Check size={16} /> : <StepIcon size={17} />}</span><span><small>Step {step.number}</small><strong>{step.label}</strong></span><ChevronRight className="wa-nav-chevron" size={16} /></button>; })}
        </nav>
        <main className="wa-stage">
          {setupStep === 1 && <section className="wa-stage-panel">
            <div className="wa-stage-heading"><span>1</span><h2>Connect company WhatsApp</h2></div>
            <div className="wa-connect-layout">
              <div className="wa-connect-guide">
                <ol><li><span>1</span>Open WhatsApp on the company phone</li><li><span>2</span>Open Linked devices and select Link a device</li><li><span>3</span>Scan the QR code shown here</li></ol>
                <div className="wa-actions"><LoadingButton type="button" loading={action === 'connect' || starting} loadingText="Connecting..." disabled={Boolean(action) || connected || awaitingScan || Boolean(pollError)} onClick={() => changeConnection('connect')}>{connection.status === 'disconnected' ? 'Show QR code' : 'Reconnect WhatsApp'}</LoadingButton>{(connected || awaitingScan || connection.status === 'error') && <LoadingButton type="button" className="secondary-action" loading={action === 'disconnect'} loadingText="Disconnecting..." disabled={Boolean(action)} onClick={() => changeConnection('disconnect')}>Disconnect</LoadingButton>}</div>
                {(pollError || connection.error) && <p className="form-message error" role="alert">{pollError || connection.error}</p>}
              </div>
              <div className={`wa-qr-area${connected ? ' is-connected' : ''}`}>{connection.qr && !pollError ? <img src={connection.qr} width="240" height="240" alt="Scan this QR code from WhatsApp Linked devices" /> : <><QrCode size={58} strokeWidth={1.2} /><strong>{connected ? 'WhatsApp is connected' : starting || awaitingScan ? 'Preparing QR code...' : 'Select Show QR code'}</strong></>}</div>
            </div>
          </section>}
          {setupStep === 2 && <section className="wa-stage-panel">
            <div className="wa-stage-heading"><span>2</span><h2>Choose new lead details</h2></div>
            {loadError ? <div className="wa-inline-error" role="alert"><span>{loadError}</span><button className="secondary-action" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></div> : !form ? <div className="wa-stage-loading" role="status">Loading lead settings...</div> : <fieldset className="wa-settings-fields" disabled={saving || testing}><div className="wa-fields-grid"><label>Assign leads to<Select aria-label="Assign leads to" className="antd-crm-select" showSearch optionFilterProp="label" value={form.assignedTo || undefined} placeholder="Select employee" options={users.map((user) => ({ value: user._id, label: user.name }))} onChange={(value) => update('assignedTo', value)} /></label><label>Lead status<Select aria-label="Lead status" className="antd-crm-select" value={form.status} options={statuses.map((status) => ({ value: status, label: status }))} onChange={(value) => update('status', value)} /></label>{[['Lead source', 'leadSource', 'source'], ['Company type', 'customerType', 'customerType'], ['Segment', 'segment', 'segment']].map(([label, type, field]) => <DefaultDropdown key={field} label={label} type={type} value={form[field]} options={options} token={token} required={field === 'source'} onChange={(value) => update(field, value)} onAdded={(option) => setOptions((current) => [...current, option])} />)}<label>Priority<Select aria-label="Priority" className="antd-crm-select" value={form.priority} options={['Low', 'Medium', 'High'].map((value) => ({ value, label: value }))} onChange={(value) => update('priority', value)} /></label></div><div className="wa-info-strip"><Check size={16} />Repeat phone numbers update the existing lead.</div></fieldset>}
          </section>}
          {setupStep === 3 && <section className="wa-stage-panel">
            <div className="wa-stage-heading"><span>3</span><h2>Choose messages that create leads</h2></div>
            {loadError ? <div className="wa-inline-error" role="alert"><span>{loadError}</span><button className="secondary-action" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></div> : !form ? <div className="wa-stage-loading" role="status">Loading message rules...</div> : <fieldset className="wa-settings-fields" disabled={saving || testing}><div className="wa-rule-layout"><div className="wa-rule-fields"><label>When should a lead be created?<Select aria-label="When should a lead be created?" className="antd-crm-select" value={form.matchMode} options={matchingModes} onChange={(value) => update('matchMode', value)} /></label><label>{['any', 'all'].includes(form.matchMode) ? 'Enter phrases, one per line' : 'Enter the message text'}<textarea maxLength={2000} rows={6} value={form.matchText} onChange={(event) => update('matchText', event.target.value)} placeholder="Example: I need a quotation" required={form.enabled} /></label><label className="wa-checkbox"><input type="checkbox" checked={form.caseSensitive} onChange={(event) => update('caseSensitive', event.target.checked)} />Treat capital and small letters differently</label></div><div className="wa-test-box"><div className="wa-test-heading"><MessageSquareText size={18} /><strong>Check an enquiry message</strong></div><label>Enquiry message<textarea maxLength={10000} rows={6} value={sample} onChange={(event) => { setSample(event.target.value); setPreview(null); }} placeholder="Paste a message here" /></label><LoadingButton type="button" className="secondary-action" loading={testing} disabled={!sample.trim() || !form.matchText.trim()} onClick={testMessage}>Check message</LoadingButton>{preview !== null && <p className={`form-message ${preview ? 'success' : 'error'}`} role="status">{preview ? 'This message will create a lead.' : 'This message will be ignored.'}</p>}</div></div></fieldset>}
          </section>}
        </main>
      </div>
      <footer className="wa-workspace-footer"><span className={dirty ? 'is-dirty' : ''}>{dirty ? 'Unsaved changes' : 'Settings saved'}</span><div>{setupStep > 1 && <button className="secondary-action" type="button" onClick={() => setSetupStep((step) => step - 1)}><ChevronLeft size={16} />Back</button>}{setupStep < 3 ? <button className="primary-action" type="button" disabled={!form} onClick={() => setSetupStep((step) => step + 1)}>Continue<ChevronRight size={16} /></button> : <LoadingButton loading={saving} loadingText="Saving..." disabled={!form || testing}><Save size={16} />Save changes</LoadingButton>}</div></footer>
    </form>}
  </div>;
}
