import LoadingButton from '../../components/LoadingButton.jsx';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../services/api.js';
import { navigate } from '../../utils/navigation.js';

function ForgotPasswordForm() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestOtp(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try { const data = await api.requestResetOtp({ email }); setStep('otp'); toast.success(data.message); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try { const data = await api.verifyResetOtp({ email, otp }); setResetToken(data.resetToken); setStep('password'); toast.success('OTP verified successfully. Create your new password.'); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }

  async function reset(event) {
    event.preventDefault();
    if (loading) return;
    if (password !== confirmPassword) { toast.error('New password and retype password must match.'); return; }
    setLoading(true);
    try { const data = await api.resetPassword({ resetToken, password }); toast.success(data.message); setTimeout(() => navigate('/login'), 1100); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }

  if (step === 'password') return <form className="auth-form" onSubmit={reset}><p className="otp-note">OTP verified for <strong>{email}</strong>. Set a new password below.</p><label>New Password<input required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" /></label><label>Retype New Password<input required minLength="8" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Retype new password" type="password" /></label><LoadingButton loading={loading} loadingText="Updating…">Change password</LoadingButton></form>;
  if (step === 'otp') return <form className="auth-form" onSubmit={verifyOtp}><p className="otp-note">Enter the 6-digit code sent to <strong>{email}</strong>.</p><label>Email OTP<input required autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="000000" /></label><LoadingButton loading={loading} loadingText="Verifying…">Verify OTP</LoadingButton></form>;
  return <form className="auth-form" onSubmit={requestOtp}><p className="otp-note">Enter your registered email to receive a password-reset code.</p><label>Work Email<input required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@jbcorporation.com" type="email" /></label><LoadingButton loading={loading} loadingText="Sending code…">Send verification code</LoadingButton></form>;
}

export default ForgotPasswordForm;
