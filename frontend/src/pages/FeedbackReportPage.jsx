import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/apiClient';
import { Award, AlertCircle, Mic, LayoutDashboard, Loader, ArrowLeft, Download } from 'lucide-react';
import { getScoreColor, getInitials } from '../lib/utils';
import { generateFeedbackPDF } from '../lib/generatePDF';

const ScoreBar = ({ score }) => {
  const pct = Math.min(100, (score / 10) * 100);
  return (
    <div className="score-bar-track" style={{ margin: 0 }}>
      <div
        className="score-bar-fill"
        style={{ width: `${pct}%`, backgroundColor: getScoreColor(score) }}
      />
    </div>
  );
};

const BREAKDOWN_LABELS = {
  communication: 'Communication',
  technical_depth: 'Technical Depth',
  examples_quality: 'Examples Quality',
  problem_solving: 'Problem Solving',
};

const FeedbackReportPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  useEffect(() => {
    let retryTimeout;
    const fetchReport = async () => {
      try {
        // Fetch report and session metadata in parallel
        const [res, sessionRes] = await Promise.allSettled([
          apiClient.get(`/feedback/${sessionId}`),
          apiClient.get(`/sessions/${sessionId}`),
        ]);

        if (sessionRes.status === 'fulfilled' && sessionRes.value?.data?.session) {
          setSession(sessionRes.value.data.session);
        }

        const reportRes = res.status === 'fulfilled' ? res.value : null;
        if (reportRes?.success && reportRes.data) {
          setReport(reportRes.data);
          setLoading(false);
        } else {
          if (retries < 10) {
            retryTimeout = setTimeout(() => setRetries((r) => r + 1), (reportRes?.retryAfter || 4) * 1000);
          } else {
            setError('Feedback report is taking longer than expected. Try refreshing in a moment.');
            setLoading(false);
          }
        }
      } catch (err) {
        if (err.data?.noReportPossible) {
          setError(err.data.message);
          setLoading(false);
        } else if (err.status === 202) {
          if (retries < 10) {
            retryTimeout = setTimeout(() => setRetries((r) => r + 1), 4000);
          } else {
            setError('Feedback report is taking longer than expected.');
            setLoading(false);
          }
        } else {
          setError(err.message || 'Could not load feedback report');
          setLoading(false);
        }
      }
    };
    fetchReport();
    return () => clearTimeout(retryTimeout);
  }, [sessionId, retries]);

  if (loading) {
    return (
      <div className="page centered">
        <div className="relative z-1" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Loader className="spinner" style={{ width: 40, height: 40 }} />
          </div>
          <h2 style={{ marginBottom: 12, fontSize: '1.2rem', letterSpacing: '0.05em' }}>GENERATING YOUR REPORT</h2>
          <p className="text-secondary mb-8">The AI is analyzing your interview performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page centered">
        <div className="alert alert-error mb-4" style={{ maxWidth: 480 }}>
          <AlertCircle size={14} strokeWidth={1.5} />
          <span>{error}</span>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>BACK TO DASHBOARD</button>
      </div>
    );
  }

  if (!report) return null;
  const { overall_score, strengths, weaknesses, detailed_feedback } = report;

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      // Dynamic import keeps jspdf out of the initial bundle
      await generateFeedbackPDF(report, session, user?.name);
    } catch (e) {
      console.error('[PDF]', e);
    } finally {
      setPdfLoading(false);
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

      <div className="container relative z-1" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 1024 }}>
        {/* Navigation back */}
        <div style={{ marginBottom: 24 }} className="page-enter">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={12} strokeWidth={1.5} /> BACK TO DASHBOARD
          </button>
        </div>
        {/* Header */}
        <div className="page-enter" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ marginBottom: 8, fontSize: '1.5rem', letterSpacing: '0.05em' }}>Feedback Report</h1>
          <p className="text-secondary font-mono text-xs">DETAILED ANALYSIS OF YOUR INTERVIEW PERFORMANCE</p>
        </div>

        {/* Score hero - styled as a technical readout panel */}
        <div className="card card-neutral page-enter" style={{ textAlign: 'center', marginBottom: 32, padding: '36px 24px' }}>
          <div className="score-terminal-label">OVERALL PERFORMANCE RATING</div>
          <div style={{ marginBottom: 16 }}>
            <span className="score-terminal-val" style={{ fontSize: '4.5rem', color: getScoreColor(overall_score) }}>{overall_score}</span>
            <span className="score-terminal-suffix">/10</span>
          </div>
          {detailed_feedback?.overall_impression && (
            <p className="score-terminal-desc" style={{ maxWidth: 640, margin: '16px auto 0' }}>
              {detailed_feedback.overall_impression}
            </p>
          )}
        </div>

        <div className="grid-2 page-enter" style={{ marginBottom: 32 }}>
          {/* Strengths */}
          <div className="card card-neutral" style={{ height: 460, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Award size={18} strokeWidth={1.5} style={{ color: 'var(--status-success)' }} /> STRENGTHS
            </h2>
            <div className="sleek-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
              {(strengths || []).length === 0 ? (
                <p className="text-muted text-sm">No strengths recorded.</p>
              ) : (
                (strengths || []).map((s, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-base)', border: '1px solid var(--border-hairline)', borderLeft: '4px solid var(--status-success)', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--status-success)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>{s.area.toUpperCase()}</div>
                    <p className="text-secondary text-sm" style={{ lineHeight: 1.5 }}>{s.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="card card-neutral" style={{ height: 460, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: 20, fontSize: '1rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <AlertCircle size={18} strokeWidth={1.5} style={{ color: 'var(--status-fail)' }} /> AREAS TO IMPROVE
            </h2>
            <div className="sleek-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
              {(weaknesses || []).length === 0 ? (
                <p className="text-muted text-sm">No weaknesses recorded.</p>
              ) : (
                (weaknesses || []).map((w, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-base)', border: '1px solid var(--border-hairline)', borderLeft: '4px solid var(--status-fail)', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--status-fail)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>{w.area.toUpperCase()}</div>
                    <p className="text-secondary text-sm" style={{ lineHeight: 1.5 }}>{w.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detailed score breakdown */}
        {detailed_feedback && (
          <div className="card card-neutral page-enter" style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 24, fontSize: '1rem', letterSpacing: '0.05em' }}>SCORE BREAKDOWN</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => {
                const item = detailed_feedback[key];
                if (!item) return null;
                return (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border-hairline)',
                  }}>
                    {/* Column 1: Title */}
                    <div style={{ width: 140, flexShrink: 0, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      {label}
                    </div>

                    {/* Column 2: Description */}
                    <div className="text-xs text-muted" style={{ flex: 1, lineHeight: 1.4 }}>
                      {item.notes || '—'}
                    </div>

                    {/* Column 3 & 4: Progress Bar and Score clubbed together */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 100 }}>
                        <ScoreBar score={item.score} />
                      </div>
                      <div style={{
                        width: 50,
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: getScoreColor(item.score),
                      }}>
                        {item.score}<span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>/10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="page-enter" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            id="practice-again-btn"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/interview/select')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Mic size={16} strokeWidth={1.5} /> PRACTICE AGAIN →
          </button>

          {/* Download PDF */}
          <button
            id="download-pdf-btn"
            className="btn btn-secondary btn-lg"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {pdfLoading
              ? <><Loader size={16} className="spinner" /> GENERATING PDF...</>
              : <><Download size={16} strokeWidth={1.5} /> DOWNLOAD PDF</>
            }
          </button>

          {/* <button
            className="btn btn-ghost btn-lg"
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <LayoutDashboard size={16} strokeWidth={1.5} /> DASHBOARD
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default FeedbackReportPage;
