import { useNavigate } from 'react-router-dom';
import { Brain, Code, Layers, Handshake } from 'lucide-react';
import { getScoreColor } from '../lib/utils';

const TYPE_META = {
  behavioral: { label: 'Behavioral', Icon: Brain },
  technical: { label: 'Technical', Icon: Code },
  system_design: { label: 'System Design', Icon: Layers },
  hr_culture_fit: { label: 'HR & Culture', Icon: Handshake },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_LABELS = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  abandoned: 'ABANDONED',
};

const SessionCard = ({ session }) => {
  const navigate = useNavigate();
  const meta = TYPE_META[session.interview_type] || { label: session.interview_type, Icon: Brain };
  const score = session.overall_score;
  const IconComponent = meta.Icon;
  const isAbandoned = session.status === 'abandoned';
  const hasReport = score != null; // report exists iff a score was written back, regardless of status

  return (
    <div
      className="card card-interactive"
      id={`session-card-${session.id}`}
      onClick={() => hasReport && navigate(`/feedback/${session.id}`)}
      style={{
        cursor: hasReport ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        gap: 12,
        padding: '20px',
        border: '1px solid transparent',
      }}
    >
      {/* Top section: Icon, Title/Date, and Status badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <IconComponent className="card-icon" size={24} strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <span className={`badge badge-${session.status}`}>
            {/* Only active sessions get a pulsing dot */}
            {session.status === 'active' && <span className="status-dot status-dot-active" />}
            {STATUS_LABELS[session.status] ?? session.status.toUpperCase()}
          </span>
        </div>
        <div>
          <h3 style={{ fontSize: '0.85rem', marginBottom: 4, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{meta.label}</h3>
          <p className="text-xs text-muted font-mono">{formatDate(session.started_at)}</p>
          {isAbandoned && (
            <p className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Session ended without completion
            </p>
          )}
        </div>
      </div>

      {/* Bottom section: Score & View Report inline */}
      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {hasReport ? (
          <div>
            <span className="font-mono text-xs text-muted" style={{ marginRight: 6 }}>SCORE:</span>
            <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 600, color: getScoreColor(score) }}>
              {score}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              /10
            </span>
          </div>
        ) : (
          <div className="font-mono text-xs text-dim">NO SCORE</div>
        )}

        {hasReport && (
          <span className="text-link-arrow" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            VIEW_REPORT →
          </span>
        )}
      </div>
    </div>
  );
};

export default SessionCard;