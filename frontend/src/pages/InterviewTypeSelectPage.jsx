import { useNavigate } from 'react-router-dom';
import { Brain, Code, Layers, Handshake, ArrowLeft } from 'lucide-react';

const INTERVIEW_TYPES = [
  {
    id: 'behavioral',
    Icon: Brain,
    title: 'Behavioral',
    description: 'STAR-method stories, teamwork, conflict resolution, leadership experience',
  },
  {
    id: 'technical',
    Icon: Code,
    title: 'Technical',
    description: 'Algorithms, data structures, system concepts, coding problem-solving depth',
  },
  {
    id: 'system_design',
    Icon: Layers,
    title: 'System Design',
    description: 'Scalability trade-offs, distributed systems, architecture decisions under pressure',
  },
  {
    id: 'hr_culture_fit',
    Icon: Handshake,
    title: 'HR & Culture Fit',
    description: 'Motivations, values, working style, career goals, and company culture alignment',
  },
];

const InterviewTypeSelectPage = () => {
  const navigate = useNavigate();

  const handleSelect = (typeId) => {
    navigate('/interview/session', { state: { interviewType: typeId } });
  };

  return (
    <div className="page">
      <div className="container relative z-1" style={{ paddingTop: 32, paddingBottom: 48 }}>
        {/* Navigation back */}
        <div style={{ marginBottom: 20 }} className="page-enter">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} /> BACK TO DASHBOARD
          </button>
        </div>

        <div className="page-enter" style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ marginBottom: 8, fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'none' }}>
            Choose Your Interview Type
          </h1>
          <p className="text-secondary" style={{ maxWidth: 600, margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Select the format that matches your preparation goal. The AI will adapt its persona, questions, and follow-ups accordingly.
          </p>
        </div>

        <div className="grid-divider-container page-enter" style={{ maxWidth: 880, margin: '0 auto' }}>
          {INTERVIEW_TYPES.map((type) => {
            const IconComponent = type.Icon;
            return (
              <button
                key={type.id}
                id={`interview-type-${type.id}`}
                className="grid-divider-tile"
                onClick={() => handleSelect(type.id)}
                style={{ padding: '20px 24px', minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{
                    width: 40, height: 40, borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <IconComponent className="card-icon" size={20} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4, fontWeight: 600 }}>{type.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                    {type.description}
                  </p>
                </div>
                <div style={{ paddingTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600 }} className="text-link-arrow">
                  START →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InterviewTypeSelectPage;
