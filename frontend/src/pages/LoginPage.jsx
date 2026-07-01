import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form);
        navigate(from, { replace: true });
      } else {
        const res = await apiClient.post('/auth/forgot-password', { email: form.email });
        setSuccess(res.message || 'If that email is registered, a password reset link has been sent.');
      }
    } catch (err) {
      setError(err.message || 'Failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page centered">
      <div className="auth-container page-enter relative z-1">
        <div className="auth-logo">InterviewAI</div>
        <p className="auth-subtitle">
          {mode === 'login' ? "Welcome back — let's keep practicing" : 'Enter your email to request a reset link'}
        </p>

        <div className="card card-neutral">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="alex@company.com"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            {mode === 'login' && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Your password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="alert">
                <CheckCircle size={14} strokeWidth={1.5} />
                <span>{success}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span>{mode === 'login' ? 'Signing in...' : 'Sending link...'}</span>
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Send Reset Link'
              )}
            </button>
          </form>

          {mode === 'login' ? (
            <>
              <div className="divider">don't have an account</div>
              <Link to="/signup" className="btn btn-ghost w-full" style={{ textAlign: 'center', display: 'block' }}>
                Create account
              </Link>
            </>
          ) : (
            <>
              <div className="divider">or</div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="btn btn-ghost w-full"
                style={{ textAlign: 'center', display: 'block' }}
              >
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
