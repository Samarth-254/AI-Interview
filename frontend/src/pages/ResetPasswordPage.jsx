import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isTokenValid, setIsTokenValid] = useState(null); // null (verifying), true (valid), false (invalid)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate the reset token on component mount
  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      return;
    }

    const checkToken = async () => {
      try {
        await apiClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        setIsTokenValid(true);
      } catch (err) {
        setIsTokenValid(false);
        setError(err.message || 'This reset link has expired or is invalid.');
      }
    };

    checkToken();
  }, [token]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        token,
        password: form.password,
      });
      setSuccess(res.message || 'Password reset successfully! You can now sign in.');
      setForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page centered">
      <div className="auth-container page-enter relative z-1">
        <div className="auth-logo">InterviewAI</div>
        <p className="auth-subtitle">Reset your account password</p>

        <div className="card card-neutral">
          {!token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="alert alert-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} />
                <span>No reset token provided. Please request a new password reset link from the login page.</span>
              </div>
              <Link to="/login" className="btn btn-primary w-full" style={{ textAlign: 'center', display: 'block' }}>
                Go to Sign In
              </Link>
            </div>
          ) : isTokenValid === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                VERIFYING RESET LINK...
              </p>
            </div>
          ) : isTokenValid === false ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="alert alert-error" role="alert">
                <AlertCircle size={14} strokeWidth={1.5} />
                <span>{error || 'This reset link has expired or is invalid. Please request a new one.'}</span>
              </div>
              <Link to="/login" className="btn btn-primary w-full" style={{ textAlign: 'center', display: 'block' }}>
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="password">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoFocus
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

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

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
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || !!success}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    <span>Resetting...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="divider">or</div>

              <Link to="/login" className="btn btn-ghost w-full" style={{ textAlign: 'center', display: 'block' }}>
                Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
