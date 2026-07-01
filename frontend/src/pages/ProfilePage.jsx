import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { getInitials } from '../lib/utils';
import { JOB_ROLE_OPTIONS } from '../lib/constants';
import RoleSelect from '../components/RoleSelect';
import { Save, ArrowLeft, AlertCircle, Loader } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();

  const initialName = user?.name || '';
  const savedJobRole = user?.jobRole || user?.job_role || '';
  const initialExpLevel = user?.experienceLevel || user?.experience_level || '';
  const email = user?.email || '';

  // Detect if the saved role is a predefined option or a custom "Other" value
  const savedRoleIsCustom = savedJobRole !== '' && !JOB_ROLE_OPTIONS.includes(savedJobRole);
  const initialSelectedRole = savedRoleIsCustom ? 'Other' : savedJobRole;
  const initialCustomRole = savedRoleIsCustom ? savedJobRole : '';

  const [name, setName] = useState(initialName);
  const [selectedRole, setSelectedRole] = useState(initialSelectedRole);
  const [customRole, setCustomRole] = useState(initialCustomRole);
  const [experienceLevel, setExperienceLevel] = useState(initialExpLevel);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dropdown outside click handler
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const effectiveJobRole = selectedRole === 'Other' ? customRole.trim() : selectedRole;
  const hasChanged = name !== initialName || effectiveJobRole !== savedJobRole || experienceLevel !== initialExpLevel;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!selectedRole) { setError('Target role is required'); return; }
    if (selectedRole === 'Other' && !customRole.trim()) { setError('Please enter your custom role'); return; }
    if (!experienceLevel) { setError('Experience level is required'); return; }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiClient.patch('/auth/me', { name, jobRole: effectiveJobRole, experienceLevel });
      updateUser(res.data);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            InterviewAI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name)}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', textAlign: 'left', gap: 4 }} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.name}
              </span>
              <span className="font-mono text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                {(user?.experience_level || user?.experienceLevel)?.toUpperCase()} LEVEL
              </span>
            </div>
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 8,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 4,
                  padding: '4px 0',
                  zIndex: 1000,
                  width: 140,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <button
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'default',
                    width: '100%',
                    display: 'block',
                  }}
                  className="dropdown-item"
                >
                  VIEW PROFILE
                </button>
                <div style={{ height: 1, backgroundColor: 'var(--border-hairline)', margin: '4px 0' }} />
                <button
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'block',
                  }}
                  className="dropdown-item"
                >
                  SIGN OUT
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container relative z-1" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 600 }}>
        {/* Navigation back */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={12} strokeWidth={1.5} /> BACK TO DASHBOARD
          </button>
        </div>

        <div className="page-enter" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8, letterSpacing: '0.05em' }}>User Profile</h1>
          <p className="text-secondary font-mono text-xs">MANAGE YOUR PLATFORM IDENTITY AND TARGET SETTINGS</p>
        </div>

        <div className="card card-neutral">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Display Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email (Read only) */}
            <div className="form-group">
              <label className="form-label" htmlFor="emailAddress">Email Address</label>
              <input
                id="emailAddress"
                type="email"
                className="form-input"
                value={email}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--bg-base)' }}
              />
            </div>

            {/* Target Role */}
            <div className="form-group">
              <label className="form-label" htmlFor="targetRoleSelect">Target Job Role</label>
              <RoleSelect
                id="targetRoleSelect"
                options={JOB_ROLE_OPTIONS}
                value={selectedRole}
                onChange={(role) => { setSelectedRole(role); setCustomRole(''); }}
                placeholder="Select a role..."
              />
              {selectedRole === 'Other' && (
                <input
                  id="customRoleInput"
                  type="text"
                  className="form-input"
                  placeholder="Enter your role (e.g. Data Analyst)"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            {/* Experience Level */}
            <div className="form-group">
              <label className="form-label" htmlFor="expLevelSelect">Experience Level</label>
              <select
                id="expLevelSelect"
                className="form-input form-select"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                required
              >
                <option value="">Select level...</option>
                <option value="student">Student</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
              </select>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={14} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !hasChanged}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 4,
              }}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spinner" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={1.5} />
                  <span>SAVE CHANGES</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
