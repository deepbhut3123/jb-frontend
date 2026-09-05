import { useState } from 'react';
import AuthSwitch from './AuthSwitch.jsx';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';

function AuthPanel({ mode }) {
  const [authMode, setAuthMode] = useState(mode);
  const isLogin = authMode === 'login';
  const isRegister = authMode === 'register';

  return (
    <section className="auth-panel" aria-label="Authentication form">
      <div className="auth-header">
        <span>Team access</span>
        <h2>{isLogin ? 'Welcome back' : isRegister ? 'Create team access' : 'Reset your password'}</h2>
        <p>
          {isLogin
            ? 'Sign in to continue to the JB Corporation CRM.'
            : isRegister ? 'Register your details to request access to the internal CRM.' : 'Verify your email to securely set a new CRM password.'}
        </p>
      </div>

      {authMode !== 'forgot' && <AuthSwitch mode={authMode} onModeChange={setAuthMode} />}
      {isLogin ? <LoginForm /> : isRegister ? <RegisterForm /> : <ForgotPasswordForm />}
    </section>
  );
}

export default AuthPanel;
