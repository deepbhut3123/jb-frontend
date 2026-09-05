import { navigate } from '../../utils/navigation.js';

function AuthSwitch({ mode, onModeChange }) {
  const isLogin = mode === 'login';

  return (
    <div className="auth-switch" aria-label="Choose authentication mode">
      <button
        className={isLogin ? 'active' : ''}
        type="button"
        onClick={() => { onModeChange('login'); navigate('/login'); }}
      >
        Login
      </button>
      <button
        className={!isLogin ? 'active' : ''}
        type="button"
        onClick={() => { onModeChange('register'); navigate('/register'); }}
      >
        Register
      </button>
    </div>
  );
}

export default AuthSwitch;
