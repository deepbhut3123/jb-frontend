import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Save, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingButton from '../../../components/LoadingButton.jsx';
import { api } from '../../../services/api.js';

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordField({ id, label, value, onChange, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  return <label htmlFor={id}><span>{label}</span><div className="profile-password-field"><input id={id} required minLength={8} autoComplete={autoComplete} placeholder={placeholder} type={visible ? 'text' : 'password'} value={value} onChange={onChange} /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>;
}

export default function ProfileWorkspace({ token, user, onProfileUpdated }) {
  const [profile, setProfile] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  const [passwords, setPasswords] = useState(emptyPasswordForm);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    api.profile(token)
      .then(({ user: loadedUser }) => { if (active) setProfile({ name: loadedUser.name || '', email: loadedUser.email || '', phone: loadedUser.phone || '' }); })
      .catch((error) => toast.error(error.message))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await api.updateProfile(token, { name: profile.name, phone: profile.phone });
      setProfile({ name: response.user.name, email: response.user.email, phone: response.user.phone || '' });
      onProfileUpdated(response.user);
      toast.success(response.message);
    } catch (error) { toast.error(error.message); }
    finally { setSavingProfile(false); }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('New password and retype password must match.'); return; }
    setSavingPassword(true);
    try {
      const response = await api.changePassword(token, passwords);
      setPasswords(emptyPasswordForm);
      toast.success(response.message);
    } catch (error) { toast.error(error.message); }
    finally { setSavingPassword(false); }
  }

  return <div className="crm-content-inner profile-page">
    <div className="section-heading"><div><span className="dashboard-kicker"><UserRound size={15} /> My account</span><h1>Profile</h1><p>Update your personal details and account password.</p></div></div>
    <div className="profile-layout">
      <form className="profile-card" onSubmit={saveProfile}>
        <div className="profile-card-header"><div className="profile-card-icon"><UserRound size={21} /></div><div><h2>Personal information</h2><p>Your email address is linked to your account and cannot be changed.</p></div></div>
        <fieldset disabled={loading || savingProfile}>
          <div className="profile-fields">
            <label htmlFor="profile-name"><span>Full name</span><input id="profile-name" required maxLength={100} autoComplete="name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Enter your full name" /></label>
            <label htmlFor="profile-email"><span>Email address</span><input id="profile-email" disabled type="email" value={profile.email} aria-describedby="profile-email-note" /><small id="profile-email-note"><LockKeyhole size={13} /> Email address cannot be updated</small></label>
            <label htmlFor="profile-phone"><span>Mobile number</span><input id="profile-phone" maxLength={30} autoComplete="tel" type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Enter your mobile number" /></label>
          </div>
        </fieldset>
        <div className="profile-card-actions"><LoadingButton loading={savingProfile} loadingText="Saving…" disabled={loading}><Save size={16} />Save profile</LoadingButton></div>
      </form>

      <form className="profile-card" onSubmit={savePassword}>
        <div className="profile-card-header"><div className="profile-card-icon password"><KeyRound size={21} /></div><div><h2>Change password</h2><p>Confirm your existing password before choosing a new one.</p></div></div>
        <fieldset disabled={savingPassword}>
          <div className="profile-fields password-fields">
            <PasswordField id="current-password" label="Current password" autoComplete="current-password" placeholder="Enter current password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
            <PasswordField id="new-password" label="New password" autoComplete="new-password" placeholder="At least 8 characters" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
            <PasswordField id="confirm-password" label="Retype new password" autoComplete="new-password" placeholder="Enter new password again" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} />
          </div>
        </fieldset>
        <div className="profile-card-actions"><LoadingButton loading={savingPassword} loadingText="Updating…"><KeyRound size={16} />Change password</LoadingButton></div>
      </form>
    </div>
  </div>;
}
