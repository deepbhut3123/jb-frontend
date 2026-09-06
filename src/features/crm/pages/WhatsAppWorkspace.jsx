import { useEffect, useState } from 'react';
import { Select, Switch } from 'antd';
import { MessageCircle, QrCode, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api.js';
import LoadingButton from '../../../components/LoadingButton.jsx';

const statuses = ['New', 'Quotation', 'Followup', 'Performa-Invoice', 'Done', 'Lost'];
const matchingModes = [
  { value: 'contains', label: 'Contains this phrase' },
  { value: 'exact', label: 'Matches the whole message' },
  { value: 'any', label: 'Contains any listed phrase' },
  { value: 'all', label: 'Contains every listed phrase' },
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

  return <div className="crm-content-inner wa-settings">
    <div className="section-heading"><div><h1>Integrations</h1><p>Connect external channels and turn matching enquiries into leads.</p></div></div>
    <div className="integration-tabs" role="tablist" aria-label="Integration channels">
      <button className={activeTab === 'whatsapp' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'whatsapp'} onClick={() => setActiveTab('whatsapp')}><MessageCircle size={17} />WhatsApp</button>
      <button className={activeTab === 'indiamart' ? 'active' : ''} type="button" role="tab" aria-selected={activeTab === 'indiamart'} onClick={() => setActiveTab('indiamart')}><span className="integration-tab-mark">IM</span>IndiaMART</button>
    </div>
    {activeTab === 'indiamart' ? <section className="wa-card integration-placeholder" role="tabpanel"><div className="integration-placeholder-icon">IM</div><h2>IndiaMART integration</h2><p>Connect your IndiaMART account here to receive enquiries and create leads automatically.</p><span className="integration-coming-soon">Setup coming next</span></section> : <section className="integration-panel" role="tabpanel">
    <div className="section-heading wa-channel-heading"><div><h2>WhatsApp connection</h2><p>Connect your number and turn matching enquiries into leads.</p></div><span className={`wa-connection-badge ${connected && !pollError ? 'is-connected' : ''}`} role="status"><span />{pollError ? 'Status unavailable' : connectionLabels[connection.status] || connection.status}</span></div>
    <section className="wa-card wa-connection-card">
      <div><div className="wa-card-title"><MessageCircle size={21} /><h2>Connect WhatsApp</h2></div><p>Link one company WhatsApp account. On your phone, open WhatsApp → Linked devices → Link a device, then scan the QR code.</p>
        {connected && <p className="wa-connected-number">Linked account: <strong>{connection.account?.replace(/@.*$/, '')}</strong></p>}
        <div className="wa-actions"><LoadingButton type="button" loading={action === 'connect' || starting} loadingText="Connecting…" disabled={Boolean(action) || connected || awaitingScan || Boolean(pollError)} onClick={() => changeConnection('connect')}>{connection.status === 'disconnected' ? 'Connect WhatsApp' : 'Reconnect'}</LoadingButton>
          {(connected || awaitingScan || connection.status === 'error') && <LoadingButton type="button" className="secondary-action" loading={action === 'disconnect'} loadingText="Logging out…" disabled={Boolean(action)} onClick={() => changeConnection('disconnect')}>Log out WhatsApp</LoadingButton>}
        </div><p className="wa-hint">The connection stays on the server when you leave this page. Logging out requires another QR scan.</p>
        {(pollError || connection.error) && <p className="form-message error" role="alert">{pollError || connection.error}</p>}
      </div>
      <div className="wa-qr-area">{connection.qr && !pollError ? <img src={connection.qr} width="240" height="240" alt="Scan this QR code from WhatsApp Linked devices" /> : <><QrCode size={56} strokeWidth={1} /><span>{connected ? 'Your WhatsApp is connected' : starting || awaitingScan ? 'Preparing a fresh QR code…' : 'Your QR code will appear here'}</span></>}</div>
    </section>
    {loadError ? <div className="wa-card" role="alert"><p>{loadError}</p><button className="secondary-action" type="button" onClick={() => setReload((value) => value + 1)}>Retry loading settings</button></div> : !form ? <p role="status">Loading settings…</p> : <form onSubmit={save}>
      <fieldset className="wa-settings-fields" disabled={saving || testing}>
        <section className="wa-card wa-enable"><div><h2>Automatic lead creation</h2><p>Process new matching direct text messages. Groups, outgoing messages, and status updates are skipped.</p></div><Switch aria-label="Enable automatic lead creation" checked={form.enabled} onChange={(value) => update('enabled', value)} disabled={saving || testing} /></section>
        <div className="wa-settings-grid">
          <section className="wa-card"><h2>Default lead values</h2><p>These defaults apply to new WhatsApp leads. Existing leads keep their current values.</p>
            <div className="wa-fields-grid"><label>Default assignee<Select aria-label="Default assignee" className="antd-crm-select" showSearch optionFilterProp="label" value={form.assignedTo || undefined} placeholder="Select employee" disabled={saving || testing} options={users.map((user) => ({ value: user._id, label: user.name }))} onChange={(value) => update('assignedTo', value)} /></label>
              <label>Default status<Select aria-label="Default status" className="antd-crm-select" value={form.status} disabled={saving || testing} options={statuses.map((status) => ({ value: status, label: status }))} onChange={(value) => update('status', value)} /></label>
              {[['Default source', 'leadSource', 'source'], ['Customer type', 'customerType', 'customerType'], ['Segment', 'segment', 'segment']].map(([label, type, field]) => <DefaultDropdown key={field} label={label} type={type} value={form[field]} options={options} token={token} required={field === 'source'} onChange={(value) => update(field, value)} onAdded={(option) => setOptions((current) => [...current, option])} />)}
              <label>Priority<Select aria-label="Priority" className="antd-crm-select" value={form.priority} disabled={saving || testing} options={['Low', 'Medium', 'High'].map((value) => ({ value, label: value }))} onChange={(value) => update('priority', value)} /></label>
            </div><p className="wa-hint">New leads start with zero follow-ups. Repeat enquiries are linked to the existing lead by phone number, including the country code.</p>
          </section>
          <section className="wa-card"><h2>Message matching</h2><p>Edit the message or phrases that should create a lead.</p>
            <div className="wa-rule-fields"><label>Match rule<Select aria-label="Match rule" className="antd-crm-select" value={form.matchMode} disabled={saving || testing} options={matchingModes} onChange={(value) => update('matchMode', value)} /></label>
              <label>{['any', 'all'].includes(form.matchMode) ? 'Phrases — one per line' : 'Message to match'}<textarea maxLength={2000} rows={4} value={form.matchText} onChange={(event) => update('matchText', event.target.value)} placeholder="Example: I need a quotation" required={form.enabled} /></label>
              <label className="wa-checkbox"><input type="checkbox" checked={form.caseSensitive} onChange={(event) => update('caseSensitive', event.target.checked)} />Match capitalization exactly</label>
              <p className="wa-hint">Extra spaces and line breaks are normalized. Blank matching text never creates leads.</p>
              <label>Test with a sample message<textarea maxLength={10000} rows={3} value={sample} onChange={(event) => { setSample(event.target.value); setPreview(null); }} placeholder="Paste a customer message here" /></label>
              <LoadingButton type="button" className="secondary-action" loading={testing} disabled={!sample.trim() || !form.matchText.trim()} onClick={testMessage}>Test matching</LoadingButton>
              {preview !== null && <p className={`form-message ${preview ? 'success' : 'error'}`} role="status">{preview ? 'Matches this rule. No lead was created by this test.' : 'Does not match. This message would be skipped.'}</p>}
            </div>
          </section>
        </div>
      </fieldset>
      <div className="wa-save-bar"><span>{dirty ? 'You have unsaved changes.' : 'Saved settings apply to incoming messages.'}</span><LoadingButton loading={saving} loadingText="Saving…" disabled={testing}><Save size={16} /> Save settings</LoadingButton></div>
    </form>}
    </section>}
  </div>;
}
