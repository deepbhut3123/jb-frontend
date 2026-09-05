import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../services/api.js';
import { navigate } from '../../utils/navigation.js';

function RegisterForm() {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const update = (field) => (event) => setForm({ ...form, [field]: field === 'phone' ? event.target.value.replace(/\D/g, '') : event.target.value });

  async function requestOtp(event) {
    event.preventDefault();
    setState({ loading: true, message: '', error: '' });
    try { const data = await api.requestRegistrationOtp(form); setStep('otp'); setState({ loading: false, message: data.message, error: '' }); toast.success(data.message); }
    catch (error) { setState({ loading: false, message: '', error: error.message }); toast.error(error.message); }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setState({ loading: true, message: '', error: '' });
    try { const data = await api.verifyRegistrationOtp({ email: form.email, otp }); setStep('success'); setState({ loading: false, message: data.message || 'Account created successfully. You can now log in.', error: '' }); toast.success('OTP verified. Registration completed successfully.'); }
    catch (error) { setState({ loading: false, message: '', error: error.message }); toast.error(error.message); }
  }

  if (step === 'success') return <div className="success-state" role="status" aria-live="polite"><div className="success-icon" aria-hidden="true">✓</div><span className="success-kicker">Registration successful</span><h3>Account created successfully</h3><p>{state.message}</p><button className="primary-action" type="button" onClick={() => navigate('/login')}>Continue to login</button></div>;
  if (step === 'otp') return <form className="auth-form" onSubmit={verifyOtp}><p className="otp-note">We sent a 6-digit code to <strong>{form.email}</strong>.</p><label>Email OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="000000" /></label>{state.error && <p className="form-message error">{state.error}</p>}{state.message && <p className="form-message success">{state.message}</p>}<button className="primary-action" disabled={state.loading} type="submit">{state.loading ? 'Verifying…' : 'Verify & create account'}</button><button className="link-button" type="button" onClick={() => setStep('details')}>Use a different email</button></form>;
  return <form className="auth-form" onSubmit={requestOtp}><label>Full Name<input required value={form.name} onChange={update('name')} placeholder="Enter full name" type="text" /></label><label>Work Email<input required value={form.email} onChange={update('email')} placeholder="you@jbcorporation.com" type="email" /></label><label>Mobile Number<input value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" type="tel" /></label><label>Password<input required minLength="8" value={form.password} onChange={update('password')} placeholder="At least 8 characters" type="password" /></label>{state.error && <p className="form-message error">{state.error}</p>}<button className="primary-action" disabled={state.loading} type="submit">{state.loading ? 'Sending code…' : 'Continue with email verification'}</button></form>;
}

export default RegisterForm;
