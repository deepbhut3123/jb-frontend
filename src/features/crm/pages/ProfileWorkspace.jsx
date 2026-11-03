import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, Save, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingButton from '../../../components/LoadingButton.jsx';
import { api } from '../../../services/api.js';

export default function ProfileWorkspace({ token, user, onProfileUpdated }) {
  const [profile, setProfile] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const profileSavingRef = useRef(false);

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
    if (profileSavingRef.current) return;
    profileSavingRef.current = true;
    setSavingProfile(true);
    try {
      const response = await api.updateProfile(token, { name: profile.name, phone: profile.phone });
      setProfile({ name: response.user.name, email: response.user.email, phone: response.user.phone || '' });
      onProfileUpdated(response.user);
      toast.success(response.message);
    } catch (error) { toast.error(error.message); }
    finally { profileSavingRef.current = false; setSavingProfile(false); }
  }

  return <div className="crm-content-inner profile-page">
    <div className="section-heading"><div><h1>Profile</h1><p>Update your personal details.</p></div></div>
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

    </div>
  </div>;
}
