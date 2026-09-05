import { useState } from 'react';
import { toast } from 'react-toastify';
import { api, saveSession } from '../../services/api.js';
import { navigate } from '../../utils/navigation.js';

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ loading: false, error: '' });
  async function handleSubmit(event) {
    event.preventDefault(); setState({ loading: true, error: '' });
    try { const data = await api.login(form); saveSession(data); toast.success('Login successful. Welcome to the CRM.'); navigate('/dashboard'); }
    catch (error) { setState({ loading: false, error: error.message }); toast.error(error.message); }
  }
  return <form className="auth-form" onSubmit={handleSubmit}><label>Email Address<input required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@jbcorporation.com" type="email" /></label><label>Password<input required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter password" type="password" /></label><div className="form-options"><label className="check-row"><input type="checkbox" />Remember me</label><button className="link-button" type="button" onClick={() => navigate('/forgot-password')}>Forgot password?</button></div>{state.error && <p className="form-message error">{state.error}</p>}<button className="primary-action" disabled={state.loading} type="submit">{state.loading ? 'Signing in…' : 'Sign in to CRM'}</button></form>;
}

export default LoginForm;
