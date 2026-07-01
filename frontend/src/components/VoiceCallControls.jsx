import { useState, useCallback } from 'react';
import { vapiClient } from '../lib/vapiClient';
import { Mic, MicOff, Square, AlertTriangle } from 'lucide-react';

const VoiceCallControls = ({
  callStatus,
  onEndCall,
  sessionId,
  aiQuestion,
  utteranceId,
  progress,
  audioVolume = 0,
  isPreview = false,
  previewMuted = false,
}) => {
  const [muted, setMuted] = useState(false);

  const handleMuteToggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    vapiClient.setMuted(next);
  }, [muted]);

  const isSpeaking = callStatus === 'speaking';
  const isListening = callStatus === 'listening';
  const isProcessing = callStatus === 'processing';
  const isAudioFlowing = isSpeaking || isListening;

  const isMuted = isPreview ? (previewMuted || isProcessing) : (muted || isProcessing);

  // Scale multipliers to draw a smooth voice wave
  const scaleFactors = [0.25, 0.45, 0.75, 1.0, 1.2, 1.0, 0.75, 0.45, 0.25];

  // Helper labels
  let statusLabel = '';
  let statusColor = 'var(--text-muted)';
  if (isSpeaking) {
    statusLabel = 'AI SPEAKING';
  } else if (isListening) {
    statusLabel = 'YOUR TURN';
    statusColor = 'var(--accent)';
  } else if (isProcessing) {
    statusLabel = 'THINKING';
    statusColor = 'var(--text-dim)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%', height: '100%', minHeight: 0 }}>

      {/* Primary Transcription Panel - borderless, scrollable container */}
      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          textAlign: 'center',
          boxSizing: 'border-box',
          flex: 1,
          overflowY: 'auto',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <p
          key={utteranceId}
          className="question-fade-in"
          style={{
            fontSize: '1.6rem',
            lineHeight: '1.6',
            color: 'var(--text-primary)',
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            whiteSpace: 'pre-wrap',
            opacity: (isListening || isProcessing) ? 0.6 : 1.0,
            transition: 'opacity 300ms ease-in-out',
          }}
        >
          {aiQuestion || 'The interviewer is preparing the question...'}
        </p>
      </div>

      {/* Dynamic Status Indicator & Ambient Waveform Container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 24, height: 64, justifyContent: 'center', flexShrink: 0 }}>
        {statusLabel && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {statusLabel}
          </div>
        )}

        {isProcessing ? (
          /* Thinking state three-dot loader */
          <div className="three-dot-loader">
            <div />
            <div />
            <div />
          </div>
        ) : (
          /* Volume reactive waveform oscilloscope */
          <div className="waveform" style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {scaleFactors.map((scale, i) => {
              const baseHeight = 6;
              const dynamicHeight = isAudioFlowing ? (baseHeight + audioVolume * 34 * scale) : baseHeight;
              return (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{
                    background: isAudioFlowing ? 'var(--accent)' : 'var(--border-hairline)',
                    height: `${dynamicHeight}px`,
                    transition: 'height 45ms linear',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Button controls - generous top margin gap */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%', maxWidth: '440px', marginTop: 32, flexShrink: 0 }}>
        {/* Mute button */}
        <button
          id="mute-toggle"
          className="btn btn-secondary"
          onClick={(isPreview || isProcessing) ? undefined : handleMuteToggle}
          disabled={isProcessing}
          style={{
            flex: 1,
            height: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderColor: isProcessing ? 'var(--border-hairline)' : (isMuted ? 'var(--status-fail)' : 'var(--border-hairline)'),
            background: isProcessing ? 'var(--bg-surface-hover)' : (isMuted ? 'rgba(248,113,113,0.05)' : 'none'),
            color: isProcessing ? 'var(--text-dim)' : (isMuted ? 'var(--status-fail)' : 'var(--text-primary)'),
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: (isPreview || isProcessing) ? 'default' : 'pointer',
            opacity: isProcessing ? 0.6 : 1.0,
          }}
        >
          {isMuted ? (
            <>
              <MicOff size={16} strokeWidth={1.5} />
              {isProcessing ? 'THINKING...' : 'MUTED'}
            </>
          ) : (
            <>
              <Mic size={16} strokeWidth={1.5} style={{ fill: 'currentColor' }} />
              MIC ON
            </>
          )}
        </button>

        {/* End call button */}
        <button
          id="end-call"
          className="btn btn-secondary"
          onClick={onEndCall}
          style={{
            flex: 1,
            height: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderColor: 'var(--status-fail)',
            color: 'var(--status-fail)',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Square size={12} strokeWidth={1.5} style={{ fill: 'currentColor' }} />
          END INTERVIEW
        </button>
      </div>

      {/* Muted warning overlay alert */}
      {isMuted && !isProcessing && (
        <div className="alert alert-error" style={{ maxWidth: '440px', width: '100%', margin: '16px auto 0', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={14} strokeWidth={1.5} />
          <span>You are muted — the AI cannot hear you</span>
        </div>
      )}
    </div>
  );
};

export default VoiceCallControls;