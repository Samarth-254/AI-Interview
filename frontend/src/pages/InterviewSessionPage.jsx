import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, BACKEND_URL } from '../lib/apiClient';
import { vapiClient } from '../lib/vapiClient';
import VoiceCallControls from '../components/VoiceCallControls';
import { Mic, CheckCircle, Lightbulb, RefreshCw, Target, AlertCircle, Loader, Clock } from 'lucide-react';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '';

const INTERVIEW_TYPE_LABELS = {
  behavioral: 'Behavioral Interview',
  technical: 'Technical Interview',
  system_design: 'System Design Interview',
  hr_culture_fit: 'HR & Culture Fit',
};

const InterviewSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const interviewType = location.state?.interviewType || 'behavioral';
  const isPreview = location.state?.isPreview || false;

  const getInitialTimeLimit = (type) => {
    return (type === 'technical' || type === 'system_design') ? 20 * 60 : 10 * 60;
  };

  const [phase, setPhase] = useState('setup'); // setup | starting | active | ending | done
  const [callStatus, setCallStatus] = useState('connecting');
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [progress, setProgress] = useState({ turnCount: 0, maxTurns: 8, questionNumber: 1 });
  const [audioVolume, setAudioVolume] = useState(0);
  const [utteranceId, setUtteranceId] = useState(0); // bumps once per new AI turn — drives fade-in key

  // Floating Dev Harness state (Preview-only)
  const [previewHarnessOpen, setPreviewHarnessOpen] = useState(true);
  const [previewState, setPreviewState] = useState({
    callStatus: 'speaking',
    aiQuestion: "Could you tell me about a time when you had to design a highly scalable caching layer, and how you decided on the eviction policy under tight memory constraints?",
    progress: { turnCount: 2, maxTurns: 6, questionNumber: 3 },
    interviewType: 'behavioral',
    muted: false,
    phase: 'active',
  });

  const [timeLeft, setTimeLeft] = useState(() => getInitialTimeLimit(isPreview ? previewState.interviewType : interviewType));

  const sessionIdRef = useRef(null);
  const vapiInitialized = useRef(false);
  const callStarted = useRef(false); // guard against double-start
  const finalAiUtterancesRef = useRef([]);
  const currentPartialTextRef = useRef('');

  // Sync timeLeft when preview category changes
  useEffect(() => {
    if (isPreview) {
      setTimeLeft(getInitialTimeLimit(previewState.interviewType));
    }
  }, [isPreview, previewState.interviewType]);

  const handleEndCall = useCallback(async () => {
    setPhase('ending');
    if (isPreview) {
      setPhase('done');
      return;
    }
    try {
      await vapiClient.stopCall();
      const sid = sessionIdRef.current;
      if (sid) {
        await apiClient.post(`/sessions/${sid}/end`);
      }
    } catch (err) {
      console.error('[handleEndCall]', err);
    } finally {
      setPhase('done');
    }
  }, [isPreview]);

  /**
   * handleAbandonSession — called on unexpected Vapi errors while the page
   * is still open. Fires a regular PATCH to mark the session abandoned.
   */
  const handleAbandonSession = useCallback(async () => {
    if (isPreview) return;
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await apiClient.patch(`/sessions/${sid}/abandon`);
    } catch (err) {
      console.warn('[handleAbandonSession]', err);
    }
  }, [isPreview]);

  // sendBeacon on tab close / page unload — fires even as the page is closing
  useEffect(() => {
    if (isPreview) return;
    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current;
      const token = localStorage.getItem('auth_token');
      if (!sid || !token) return;
      // Use BACKEND_URL for sendBeacon
      const url = `${BACKEND_URL}/sessions/${sid}/abandon?_token=${encodeURIComponent(token)}`;
      navigator.sendBeacon(url);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPreview]);

  // Countdown timer interval
  useEffect(() => {
    if (phase !== 'active' || callStatus === 'connecting') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleEndCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, callStatus, handleEndCall]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const fetchSessionProgress = useCallback(async () => {
    if (isPreview) return;
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const res = await apiClient.get(`/sessions/${sid}/progress`);
      if (res.data?.success) {
        setProgress(res.data.data);
      }
    } catch (err) {
      console.warn('[fetchSessionProgress] failed:', err);
    }
  }, [isPreview]);

  const startInterview = useCallback(async () => {
    if (isPreview) {
      setPhase(previewState.phase);
      setCallStatus(previewState.callStatus);
      setAiQuestion(previewState.aiQuestion);
      setProgress(previewState.progress);
      return;
    }

    if (callStarted.current) return;
    callStarted.current = true;
    setPhase('starting');
    setError('');

    try {
      if (!VAPI_PUBLIC_KEY) {
        throw new Error('VITE_VAPI_PUBLIC_KEY is not set in frontend .env');
      }

      // Create session + get Vapi assistant config from backend
      const res = await apiClient.post('/sessions', { interviewType });
      const { session, vapiConfig } = res.data;

      sessionIdRef.current = session.id;
      setSessionId(session.id);

      // Initialize Vapi SDK once
      if (!vapiInitialized.current) {
        vapiClient.init(VAPI_PUBLIC_KEY);
        vapiInitialized.current = true;
      }

      // Register ALL event listeners BEFORE calling start()
      // to avoid any race condition where events fire during the start() await
      vapiClient.on('call-start', () => {
        setCallStatus('active');
        setPhase('active');
        fetchSessionProgress();
      });
      vapiClient.on('speech-start', () => {
        setCallStatus('speaking');
        fetchSessionProgress();
        finalAiUtterancesRef.current = [];
        currentPartialTextRef.current = '';
        setAiQuestion('');
        setUtteranceId((id) => id + 1); // new AI turn — bump so fade-in plays once per turn, not per chunk
      });
      vapiClient.on('speech-end', () => {
        // AI finished speaking, candidate's turn begins -> 'listening' is set here.
        // Candidate's own turn ending (and AI starting to "think") is handled below
        // via Vapi's actual end-of-turn signal, NOT per-chunk transcript finality.
        setCallStatus('listening');
      });
      vapiClient.on('volume-level', (volume) => {
        setAudioVolume(volume);
      });
      vapiClient.on('message', (msg) => {
        if (msg.type === 'transcript') {
          if (msg.role === 'assistant') {
            setCallStatus('speaking');
            if (msg.transcriptType === 'final') {
              finalAiUtterancesRef.current.push(msg.transcript);
              currentPartialTextRef.current = '';
            } else {
              currentPartialTextRef.current = msg.transcript;
            }
            const fullText = [...finalAiUtterancesRef.current, currentPartialTextRef.current]
              .map((str) => str.trim())
              .filter(Boolean)
              .join(' ');
            setAiQuestion(fullText);
          }
          // NOTE: removed the old `user + final -> setCallStatus('processing')` branch here.
          // Deepgram finalizes transcript chunks mid-sentence (e.g. on a breath/pause),
          // which incorrectly flipped the UI to "processing" while the candidate was
          // still mid-turn. The real signal for "candidate's turn has ended" is Vapi's
          // own speech-end-of-user-turn event, wired up separately below.
        } else if (msg.type === 'conversation-update') {
          // Trigger the processing (THINKING) state ONLY when Vapi has officially
          // finalized the user's turn and committed it to the conversation history.
          // This matches the exact moment Vapi starts calling the custom LLM webhook.
          const formatted = msg.messagesOpenAIFormatted || [];
          const lastMsg = formatted[formatted.length - 1];
          if (lastMsg && lastMsg.role === 'user') {
            setCallStatus('processing');
          }
        }
      });
      vapiClient.on('call-end', () => {
        setCallStatus('ended');
        setPhase('done');
      });
      vapiClient.on('error', (err) => {
        console.error('[Vapi error]', err);

        // Robust type-safe check to prevent crashing on object types
        const errorMsgStr = typeof err?.errorMsg === 'string' ? err.errorMsg : '';
        const errorTypeStr = typeof err?.error?.type === 'string' ? err.error.type : '';
        const errorMsgInnerStr = typeof err?.error?.msg === 'string' ? err.error.msg : '';
        const mainMsgStr = typeof err?.message === 'string' ? err.message : '';

        const isEjection =
          errorTypeStr === 'ejected' ||
          errorMsgStr.includes('Meeting has ended') ||
          errorMsgInnerStr.includes('Meeting has ended') ||
          mainMsgStr.includes('Meeting has ended');

        if (isEjection) {
          console.log('[InterviewSessionPage] Ignored Vapi ejection warning as it is a natural call wrap-up.');
          return;
        }

        let msg = 'Voice connection error';
        if (typeof err?.message === 'string') {
          msg = err.message;
        } else if (typeof err?.error?.message === 'string') {
          msg = err.error.message;
        } else if (typeof err?.errorMsg === 'string') {
          msg = err.errorMsg;
        }

        setError(`Voice error: ${msg}. Please try again.`);
        setPhase('setup');
        callStarted.current = false;
        // PATCH the session as abandoned since the call ended unexpectedly
        handleAbandonSession();
      });

      // Show "connecting" UI immediately so user sees progress
      setPhase('active');
      setCallStatus('connecting');

      // Start the web call — passes assistantId to vapi.start()
      // The SDK will create/join a Daily.co room and emit 'call-start' when ready
      await vapiClient.startCall(vapiConfig.assistantId);

    } catch (err) {
      console.error('[startInterview]', err);
      callStarted.current = false;
      setError(err.message || 'Could not start interview. Check your connection and try again.');
      setPhase('setup');
    }
  }, [interviewType, isPreview, fetchSessionProgress, previewState, handleAbandonSession]);

  useEffect(() => {
    startInterview();

    return () => {
      if (!isPreview) {
        vapiClient.offAll();
      }
    };
  }, [startInterview, isPreview]);

  // Redirect to feedback page when done
  useEffect(() => {
    if (phase === 'done') {
      if (isPreview) {
        navigate('/dashboard');
        return;
      }
      if (sessionIdRef.current) {
        const timer = setTimeout(() => {
          navigate(`/feedback/${sessionIdRef.current}`);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, navigate, isPreview]);

  const activeInterviewType = isPreview ? previewState.interviewType : interviewType;
  const typeLabel = INTERVIEW_TYPE_LABELS[activeInterviewType] || 'Interview';

  return (
    <div className="page centered" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', padding: '24px 0', boxSizing: 'border-box' }}>
      <div className="relative z-1" style={{ width: '100%', maxWidth: 680, padding: '0 24px', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, justifyContent: 'space-between' }}>
        {/* Countdown Timer (Top Right) */}
        {phase === 'active' && callStatus !== 'connecting' && (
          <div
            style={{
              position: 'absolute',
              top: -12,
              right: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              padding: '6px 12px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              zIndex: 5,
            }}
          >
            <Clock size={14} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24, flexShrink: 0 }}>
          {phase === 'active' && callStatus !== 'connecting' && (
            isPreview ? (
              <div className="badge badge-neutral font-mono" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 12, fontSize: '0.65rem', padding: '3px 8px', color: 'var(--status-fail)', borderColor: 'var(--status-fail)', gap: 6 }}>
                <span className="pulse-dot" style={{ backgroundColor: 'var(--status-fail)' }} /> PREVIEW MODE
              </div>
            ) : (
              <div className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 12, gap: 6, fontSize: '0.65rem', padding: '3px 8px' }}>
                <span className="pulse-dot" /> LIVE SESSION
              </div>
            )
          )}
          <h1 style={{ fontSize: '1.2rem', marginBottom: 4, letterSpacing: '0.05em' }}>
            {typeLabel}
          </h1>
          <p className="font-mono text-dim" style={{ fontSize: '0.65rem', letterSpacing: '0.02em', margin: 0 }}>
            {user?.name?.toUpperCase()} · {user?.job_role?.toUpperCase() || user?.jobRole?.toUpperCase()} · {(user?.experience_level || user?.experienceLevel)?.toUpperCase()}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="alert alert-error mb-8" style={{ maxWidth: 480, margin: '0 auto 20px', flexShrink: 0 }}>
            <AlertCircle size={14} strokeWidth={1.5} />
            <div>
              <div>{error}</div>
              <button className="btn btn-sm btn-secondary mt-2" onClick={() => { callStarted.current = false; startInterview(); }}>
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* Connecting & starting phase */}
        {((phase === 'starting' || (phase === 'active' && callStatus === 'connecting')) && !error) && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, flex: 1, minHeight: 0 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
            <p className="text-secondary font-mono text-xs" style={{ letterSpacing: '0.08em' }}>ESTABLISHING VOICE CONNECTION...</p>
            <p className="text-muted font-mono text-xs">
              🔒 Please allow microphone access if prompted by your browser
            </p>
          </div>
        )}

        {/* Active controls once connected */}
        {((phase === 'active' && callStatus !== 'connecting') || phase === 'ending') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', width: '100%' }}>
            <VoiceCallControls
              callStatus={phase === 'ending' ? 'ending' : callStatus}
              onEndCall={handleEndCall}
              sessionId={sessionId}
              aiQuestion={aiQuestion}
              utteranceId={utteranceId}
              progress={progress}
              audioVolume={audioVolume}
              isPreview={isPreview}
              previewMuted={previewState.muted}
            />
          </div>
        )}

        {/* Done / redirect state */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, flex: 1, minHeight: 0 }}>
            <CheckCircle size={48} strokeWidth={1.5} style={{ color: 'var(--status-success)' }} />
            <h2>Interview Complete!</h2>
            <p className="text-secondary font-mono text-xs">GENERATING YOUR FEEDBACK REPORT...</p>
            <div className="spinner" />
          </div>
        )}

        {/* Tips footer — shown quiet & collapsed during active call */}
        {phase === 'active' && callStatus !== 'connecting' && (
          <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', opacity: 0.4, flexShrink: 0 }}>
            {[
              'Speak naturally',
              'Pause briefly after finishing',
              'Use specific examples'
            ].map((tip, idx) => (
              <span key={tip} style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {idx > 0 && <span style={{ color: 'var(--text-dim)' }}>·</span>}
                {tip.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Collapsible Dev Tools Harness (Preview-only) */}
      {isPreview && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 320,
            maxHeight: '85vh',
            overflowY: 'auto',
            background: 'rgba(23, 23, 23, 0.95)',
            border: '1px dashed var(--accent)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-hairline)', paddingBottom: 8 }}>
            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>🛠️ PREVIEW DEV HARNESS</span>
            <button
              onClick={() => setPreviewHarnessOpen(!previewHarnessOpen)}
              style={{
                background: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
                padding: '2px 6px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.65rem',
              }}
            >
              {previewHarnessOpen ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {previewHarnessOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* State Switcher */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: 'var(--text-secondary)' }}>1. CALL STATE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[
                    { label: 'AI_SPEAKING', callStatus: 'speaking', phase: 'active' },
                    { label: 'LISTENING', callStatus: 'listening', phase: 'active' },
                    { label: 'PROCESSING', callStatus: 'processing', phase: 'active' },
                    { label: 'CONNECTING', callStatus: 'connecting', phase: 'active' },
                    { label: 'CALL_ENDING', callStatus: 'ending', phase: 'ending' },
                    { label: 'ENDED', callStatus: 'ended', phase: 'done' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setPreviewState((prev) => ({ ...prev, callStatus: s.callStatus, phase: s.phase }))}
                      style={{
                        padding: '4px 6px',
                        background: previewState.callStatus === s.callStatus && previewState.phase === s.phase ? 'var(--accent)' : 'var(--bg-surface-hover)',
                        color: previewState.callStatus === s.callStatus && previewState.phase === s.phase ? '#000' : 'var(--text-primary)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mute switcher */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: 'var(--text-secondary)' }}>2. MICROPHONE STATE</div>
                <button
                  onClick={() => setPreviewState((prev) => ({ ...prev, muted: !prev.muted }))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    background: previewState.muted ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.1)',
                    color: previewState.muted ? 'var(--status-fail)' : 'var(--status-success)',
                    border: `1px solid ${previewState.muted ? 'var(--status-fail)' : 'var(--status-success)'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                  }}
                >
                  {previewState.muted ? 'MUTED' : 'UNMUTED (LIVE)'}
                </button>
              </div>

              {/* Content Variations */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: 'var(--text-secondary)' }}>3. QUESTION LENGTH</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'SHORT (1 line)', text: "Please introduce yourself and your background." },
                    { label: 'LONG (3-4 lines)', text: "Could you tell me about a time when you had to design a highly scalable caching layer, and how you decided on the eviction policy under tight memory constraints?" },
                    { label: 'EMPTY / NO QUESTION', text: "" },
                  ].map((q) => (
                    <button
                      key={q.label}
                      onClick={() => setPreviewState((prev) => ({ ...prev, aiQuestion: q.text }))}
                      style={{
                        padding: '4px 6px',
                        background: previewState.aiQuestion === q.text ? 'var(--accent)' : 'var(--bg-surface-hover)',
                        color: previewState.aiQuestion === q.text ? '#000' : 'var(--text-primary)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.65rem',
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Overrides */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: 'var(--text-secondary)' }}>4. TIMER OVERRIDES</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { label: '10 MINS', secs: 10 * 60 },
                    { label: '1 MIN', secs: 60 },
                    { label: '5 SECS', secs: 5 },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setTimeLeft(t.secs)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: 'var(--bg-surface-hover)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.6rem',
                        textAlign: 'center',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interview Category */}
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 6, color: 'var(--text-secondary)' }}>5. INTERVIEW TYPE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[
                    { label: 'BEHAVIORAL', val: 'behavioral' },
                    { label: 'TECHNICAL', val: 'technical' },
                    { label: 'SYSTEM DESIGN', val: 'system_design' },
                    { label: 'HR & CULTURE', val: 'hr_culture_fit' },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        setPreviewState((prev) => ({ ...prev, interviewType: t.val }));
                      }}
                      style={{
                        padding: '4px 6px',
                        background: previewState.interviewType === t.val ? 'var(--accent)' : 'var(--bg-surface-hover)',
                        color: previewState.interviewType === t.val ? '#000' : 'var(--text-primary)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.6rem',
                        textAlign: 'center',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewSessionPage;