import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { GraduationCap, User, Cpu, Award, AlertTriangle } from 'lucide-react';
import { JOB_ROLE_OPTIONS } from '../lib/constants';
import RoleSelect from '../components/RoleSelect';

const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student', Icon: GraduationCap, desc: 'Currently studying or recent grad' },
  { value: 'junior', label: 'Junior', Icon: User, desc: '0–2 years of experience' },
  { value: 'mid', label: 'Mid-Level', Icon: Cpu, desc: '2–5 years of experience' },
  { value: 'senior', label: 'Senior', Icon: Award, desc: '5+ years of experience' },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The effective role value submitted to the API
  const effectiveRole = selectedRole === 'Other' ? customRole.trim() : selectedRole;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select your target role'); return; }
    if (selectedRole === 'Other' && !customRole.trim()) {
      setError('Please enter your custom role'); return;
    }
    if (!experienceLevel) { setError('Please select your experience level'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.patch('/auth/me', { jobRole: effectiveRole, experienceLevel });
      updateUser(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page centered">
      <div className="relative z-1 page-enter" style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ marginBottom: 8, fontSize: '1.6rem', letterSpacing: '0.05em' }}>
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Tell us about yourself so the AI can tailor the interview to your level.</p>
        </div>

        <div className="card card-neutral">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Job Role Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="jobRoleSelect">What role are you interviewing for?</label>
              <RoleSelect
                id="jobRoleSelect"
                options={JOB_ROLE_OPTIONS}
                value={selectedRole}
                onChange={(role) => { setSelectedRole(role); setCustomRole(''); }}
                placeholder="Select a role..."
              />

              {/* "Other" escape hatch */}
              {selectedRole === 'Other' && (
                <input
                  id="customRole"
                  type="text"
                  className="form-input"
                  placeholder="Enter your role (e.g. Data Analyst)"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  autoFocus
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            {/* Experience Level Tiles */}
            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <div className="grid-divider-container" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {EXPERIENCE_LEVELS.map((level) => {
                  const IconComponent = level.Icon;
                  const isSelected = experienceLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      id={`level-${level.value}`}
                      className={`grid-divider-tile ${isSelected ? 'card-selected' : ''}`}
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: 'none',
                        background: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-base)'
                      }}
                      onClick={() => setExperienceLevel(level.value)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <IconComponent className="card-icon" size={16} strokeWidth={1.5} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {level.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-muted" style={{ lineHeight: 1.4 }}>{level.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span>{error}</span>
              </div>
            )}

            <button id="onboarding-submit" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Continue to Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
