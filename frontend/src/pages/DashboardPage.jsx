import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import SessionCard from '../components/SessionCard';
import { Mic, MicOff, Brain, Code, Layers, Handshake, SlidersHorizontal } from 'lucide-react';
import { getScoreColor, getInitials } from '../lib/utils';

const FILTER_OPTIONS = [
  { value: 'all', label: 'ALL' },
  { value: 'behavioral', label: 'BEHAVIORAL' },
  { value: 'technical', label: 'TECHNICAL' },
  { value: 'system_design', label: 'SYSTEM DESIGN' },
  { value: 'hr_culture_fit', label: 'HR & CULTURE' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef(null);
  const filtersRef = useRef(null);

  // Defensively map role & experience level keys
  const jobRole = user?.jobRole || user?.job_role || '';
  const experienceLevel = user?.experienceLevel || user?.experience_level || '';

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await apiClient.get('/sessions');
        setSessions(res.data || []);
      } catch (err) {
        setError(err.message || 'Could not load sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Dropdown outside click handler
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (dropdownOpen || showFilters) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen, showFilters]);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const avgScore = completedSessions.length > 0
    ? (completedSessions.reduce((sum, s) => sum + (parseFloat(s.overall_score) || 0), 0) / completedSessions.length).toFixed(1)
    : null;

  const filteredSessions = sessions
    .filter((s) => {
      if (filter !== 'all' && s.interview_type !== filter) return false;
      if (statusFilter === 'completed') {
        if (s.status !== 'completed') return false;
      } else if (statusFilter === 'abandoned') {
        if (s.status !== 'abandoned' && s.status !== 'active') return false;
      }
      if (scoreFilter === 'high') {
        const val = parseFloat(s.overall_score);
        if (isNaN(val) || val < 7.0) return false;
      } else if (scoreFilter === 'low') {
        const val = parseFloat(s.overall_score);
        if (!isNaN(val) && val >= 7.0) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.started_at) - new Date(a.started_at);
      } else if (sortBy === 'oldest') {
        return new Date(a.started_at) - new Date(b.started_at);
      } else if (sortBy === 'score_desc') {
        const scoreA = parseFloat(a.overall_score) || 0;
        const scoreB = parseFloat(b.overall_score) || 0;
        return scoreB - scoreA;
      } else if (sortBy === 'score_asc') {
        const scoreA = parseFloat(a.overall_score) || 999;
        const scoreB = parseFloat(b.overall_score) || 999;
        return scoreA - scoreB;
      }
      return 0;
    });

  const getFilterEmptyLabel = () => {
    switch (filter) {
      case 'behavioral': return 'BEHAVIORAL';
      case 'technical': return 'TECHNICAL';
      case 'system_design': return 'SYSTEM DESIGN';
      case 'hr_culture_fit': return 'HR & CULTURE';
      default: return '';
    }
  };

  const getSubjectMetrics = (type) => {
    const typeSessions = sessions.filter((s) => s.interview_type === type);
    const completed = typeSessions.filter((s) => s.status === 'completed');
    const totalCount = typeSessions.length;
    const completedCount = completed.length;
    const avg = completedCount > 0
      ? (completed.reduce((sum, s) => sum + (parseFloat(s.overall_score) || 0), 0) / completedCount).toFixed(1)
      : null;
    return { totalCount, completedCount, avg };
  };

  const behavioralMetrics = getSubjectMetrics('behavioral');
  const technicalMetrics = getSubjectMetrics('technical');
  const systemDesignMetrics = getSubjectMetrics('system_design');
  const hrCultureMetrics = getSubjectMetrics('hr_culture_fit');

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
                  onClick={() => navigate('/profile')}
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

      <div className="container relative z-1" style={{ paddingTop: 48, paddingBottom: 80 }}>
        {/* Welcome greeting header row */}
        <div className="page-enter" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', textTransform: 'none', margin: 0 }}>
            Welcome back, {user?.name}
          </h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* <button
              id="preview-demo-btn"
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/interview/session', { state: { isPreview: true } })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}
            >
              PREVIEW DEMO
            </button> */}
            <button
              id="start-interview-btn"
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/interview/select')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}
            >
              <Mic size={16} strokeWidth={1.5} /> START NEW INTERVIEW →
            </button>
          </div>
        </div>

        {/* Stats Hero Section */}
        <div className="stats-hero-layout page-enter" style={{ marginBottom: 48 }}>
          {/* Card 1: Overall Diagnostic */}
          <div className="card card-neutral" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 20px',
            gap: 12,
            border: 'none',
            backgroundColor: 'var(--bg-surface-hover)'
          }}>
            <div>
              <div className="score-terminal-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>OVERALL DIAGNOSTIC</div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="score-terminal-val" style={{ fontSize: '2.5rem', color: getScoreColor(avgScore), lineHeight: 1 }}>{avgScore ? avgScore : '—'}</span>
                {avgScore && <span className="score-terminal-suffix" style={{ fontSize: '1.1rem', color: 'var(--text-dim)' }}>/10</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-hairline)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>SESSIONS:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sessions.length || '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{completedSessions.length || '0'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Behavioral Box */}
          <div className="card card-neutral" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 20px', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="score-terminal-label" style={{ margin: 0 }}>BEHAVIORAL</span>
                <Brain size={14} className="text-muted" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="score-terminal-val" style={{ fontSize: '1.75rem', color: getScoreColor(behavioralMetrics.avg) }}>{behavioralMetrics.avg || '—'}</span>
                {behavioralMetrics.avg && <span className="score-terminal-suffix" style={{ fontSize: '0.85rem' }}>/10</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-hairline)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>SESSIONS:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{behavioralMetrics.totalCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{behavioralMetrics.completedCount}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Technical Box */}
          <div className="card card-neutral" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 20px', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="score-terminal-label" style={{ margin: 0 }}>TECHNICAL</span>
                <Code size={14} className="text-muted" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="score-terminal-val" style={{ fontSize: '1.75rem', color: getScoreColor(technicalMetrics.avg) }}>{technicalMetrics.avg || '—'}</span>
                {technicalMetrics.avg && <span className="score-terminal-suffix" style={{ fontSize: '0.85rem' }}>/10</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-hairline)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>SESSIONS:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{technicalMetrics.totalCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{technicalMetrics.completedCount}</span>
              </div>
            </div>
          </div>

          {/* Card 4: System Design Box */}
          <div className="card card-neutral" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 20px', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="score-terminal-label" style={{ margin: 0 }}>SYSTEM DESIGN</span>
                <Layers size={14} className="text-muted" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="score-terminal-val" style={{ fontSize: '1.75rem', color: getScoreColor(systemDesignMetrics.avg) }}>{systemDesignMetrics.avg || '—'}</span>
                {systemDesignMetrics.avg && <span className="score-terminal-suffix" style={{ fontSize: '0.85rem' }}>/10</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-hairline)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>SESSIONS:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{systemDesignMetrics.totalCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{systemDesignMetrics.completedCount}</span>
              </div>
            </div>
          </div>

          {/* Card 5: HR & Culture Box */}
          <div className="card card-neutral" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 20px', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="score-terminal-label" style={{ margin: 0 }}>HR & CULTURE</span>
                <Handshake size={14} className="text-muted" strokeWidth={1.5} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="score-terminal-val" style={{ fontSize: '1.75rem', color: getScoreColor(hrCultureMetrics.avg) }}>{hrCultureMetrics.avg || '—'}</span>
                {hrCultureMetrics.avg && <span className="score-terminal-suffix" style={{ fontSize: '0.85rem' }}>/10</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-hairline)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>SESSIONS:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{hrCultureMetrics.totalCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="font-mono text-xs text-muted" style={{ fontSize: '0.65rem' }}>COMPLETED:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{hrCultureMetrics.completedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions list */}
        <div className="page-enter">
          {/* Header row with Title and Filter Trigger */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.05em' }}>Past Sessions</h2>
            <div style={{ position: 'relative' }} ref={filtersRef}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-ghost btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--border-hairline)',
                  borderColor: showFilters ? 'var(--accent)' : 'var(--border-hairline)',
                  borderRadius: 4,
                  padding: '6px 12px',
                  background: showFilters ? 'var(--bg-surface-hover)' : 'none',
                }}
              >
                <SlidersHorizontal size={14} strokeWidth={1.5} style={{ color: showFilters ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="font-mono text-xs" style={{ fontWeight: 600, color: showFilters ? 'var(--text-primary)' : 'var(--text-muted)' }}>FILTERS</span>
              </button>

              {showFilters && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 8,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 4,
                    padding: '16px 20px',
                    zIndex: 1000,
                    width: 280,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {/* Filter by Status */}
                  <div>
                    <div className="font-mono text-xs text-muted" style={{ marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>STATUS</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['all', 'completed', 'abandoned'].map((statusOpt) => {
                        const isActive = statusFilter === statusOpt;
                        return (
                          <button
                            key={statusOpt}
                            onClick={() => setStatusFilter(statusOpt)}
                            style={{
                              background: isActive ? 'var(--bg-surface-hover)' : 'none',
                              border: '1px solid var(--border-hairline)',
                              borderColor: isActive ? 'var(--accent)' : 'var(--border-hairline)',
                              borderRadius: 4,
                              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.65rem',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            {statusOpt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter by Score Threshold */}
                  <div>
                    <div className="font-mono text-xs text-muted" style={{ marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>SCORE VALUE</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { value: 'all', label: 'ALL' },
                        { value: 'high', label: '>= 7.0 (HIGH)' },
                        { value: 'low', label: '< 7.0 (LOW)' },
                      ].map((scoreOpt) => {
                        const isActive = scoreFilter === scoreOpt.value;
                        return (
                          <button
                            key={scoreOpt.value}
                            onClick={() => setScoreFilter(scoreOpt.value)}
                            style={{
                              background: isActive ? 'var(--bg-surface-hover)' : 'none',
                              border: '1px solid var(--border-hairline)',
                              borderColor: isActive ? 'var(--accent)' : 'var(--border-hairline)',
                              borderRadius: 4,
                              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.65rem',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            {scoreOpt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sort by option */}
                  <div>
                    <div className="font-mono text-xs text-muted" style={{ marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>SORT BY</div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-base)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        padding: '6px 8px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <option value="newest">NEWEST FIRST</option>
                      <option value="oldest">OLDEST FIRST</option>
                      <option value="score_desc">SCORE: HIGH TO LOW</option>
                      <option value="score_asc">SCORE: LOW TO HIGH</option>
                    </select>
                  </div>

                  {/* Reset Filters button */}
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setScoreFilter('all');
                      setSortBy('newest');
                    }}
                    style={{
                      marginTop: 4,
                      background: 'none',
                      border: '1px dashed var(--border-hairline)',
                      borderRadius: 4,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      padding: '6px 0',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 600,
                      width: '100%',
                    }}
                    className="dropdown-item"
                  >
                    RESET FILTERS
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter row */}
          <div style={{
            display: 'flex',
            gap: 24,
            borderBottom: '1px solid var(--border-hairline)',
            marginBottom: 24,
            overflowX: 'auto',
            paddingBottom: 2,
          }}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '8px 4px 10px',
                    cursor: 'pointer',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 100 }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-error">{error}</div>
          )}

          {!loading && !error && filteredSessions.length === 0 && (
            <div className="card card-neutral" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <MicOff size={32} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              </div>
              {filter === 'all' ? (
                <>
                  <h3 style={{ marginBottom: 8, fontSize: '1rem' }}>No interviews yet</h3>
                  <p className="text-secondary" style={{ marginBottom: 24, fontSize: '0.9rem' }}>
                    Start your first mock interview and get instant AI feedback.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/interview/select')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Mic size={14} strokeWidth={1.5} /> START YOUR FIRST INTERVIEW →
                  </button>
                </>
              ) : (
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  No {getFilterEmptyLabel()} sessions yet
                </div>
              )}
            </div>
          )}

          {!loading && filteredSessions.length > 0 && (
            <div className="sessions-grid">
              {filteredSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
