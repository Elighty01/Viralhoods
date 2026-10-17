import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Search,
  Mic,
  MicOff,
  Radio,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  Lock,
} from 'lucide-react';
import { User } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  groundingQueries?: string[];
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSector?: string;
  currentUser: User | null;
  onOpenAuth: (message?: string) => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  activeSector = 'All',
  currentUser,
  onOpenAuth,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      text: `Hello! I am your Viralhoods AI Intelligence Assistant. Ask me anything about current trending developments, sector analyses in ${activeSector !== 'All' ? activeSector : 'global news'}, or fact-checking. Search grounding is active for verified real-time insights.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveVoice, setIsLiveVoice] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  // Member Protection: Feature is exclusive to signed-up members
  if (!currentUser) {
    return (
      <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <aside
          className="drawer-panel"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(2,132,199,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="var(--blue)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>AI Intelligence Assistant</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sun)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Member Access Required
                  </span>
                </div>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                margin: '20px 0',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Lock size={28} color="var(--sun)" />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800 }}>Members Only Feature</h4>
              <p style={{ margin: '0 0 20px', color: 'var(--fg-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                The AI Intelligence Assistant is reserved exclusively for registered Viralhoods members. Create a free account or log in to unlock real-time news intelligence, live search grounding, and audio briefings.
              </p>

              <div style={{ textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--blue)' }}>
                  Included with Free Membership:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  <li>Gemini 3.8 Flash real-time intelligence & search grounding</li>
                  <li>Live voice speech synthesis & interactive briefings</li>
                  <li>Sector breakdown for all 10 monitored industries</li>
                  <li>Instant verified fact-checking with live citations</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onClose();
                  onOpenAuth('Please create an account or sign in to access the AI Intelligence Assistant.');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                }}
              >
                Sign In or Register (Free)
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
            Already have an account? Sign in with your Gmail or username.
          </div>
        </aside>
      </div>
    );
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = [...messages.filter((m) => m.id !== 'init'), userMsg].map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          model: selectedModel,
          useSearch: useSearchGrounding,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        role: 'assistant',
        text: data.text || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingQueries: data.searchGrounding || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If in Live Voice Mode, speak out response with TTS
      if (isLiveVoice && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(assistantMsg.text);
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          text: `Apologies, I encountered an error: ${err?.message || 'Check your internet connection'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Microphone Audio Recording & gemini-3.5-transcribe
  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            setIsLoading(true);
            try {
              const transRes = await fetch('/api/gemini/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  mimeType: 'audio/webm',
                }),
              });
              const transData = await transRes.json();
              if (transData.text) {
                setInputText(transData.text);
              }
            } catch (err) {
              console.error('Transcription failed:', err);
            } finally {
              setIsLoading(false);
            }
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert('Microphone access is required for speech transcription.');
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        height: '600px',
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--bg-card)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflow: 'hidden',
      }}
      role="dialog"
      aria-label="Viralhoods AI Intelligence Assistant"
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--blue)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--fg)' }}>
              Viralhoods AI Assistant
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
              Multi-turn Intelligence · Search Grounded
            </div>
          </div>
        </div>

        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close Assistant"
        >
          <X size={18} />
        </button>
      </div>

      {/* Control Strip: Model, Search Grounding & Voice Conversation toggle */}
      <div
        style={{
          padding: '8px 14px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Model Selector */}
        <select
          value={selectedModel}
          onChange={(e: any) => setSelectedModel(e.target.value)}
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            background: 'var(--bg-subtle)',
            color: 'var(--fg)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <option value="gemini-3.8-flash">Flash (General News)</option>
          <option value="gemini-4-argon">Argon (Deep Reasoning)</option>
          <option value="gemini-3.1-flash-lite">Lite (Fast Facts)</option>
        </select>

        {/* Search Grounding Toggle */}
        <button
          type="button"
          onClick={() => setUseSearchGrounding(!useSearchGrounding)}
          style={{
            background: useSearchGrounding ? 'var(--blue-tint)' : 'transparent',
            color: useSearchGrounding ? 'var(--blue)' : 'var(--fg-muted)',
            border: '1px solid',
            borderColor: useSearchGrounding ? 'var(--blue)' : 'var(--line)',
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <Search size={12} /> Search Grounding
        </button>

        {/* Live Audio / Voice Mode Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !isLiveVoice;
            setIsLiveVoice(next);
            if (!next && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }}
          style={{
            background: isLiveVoice ? '#fef3c7' : 'transparent',
            color: isLiveVoice ? '#b45309' : 'var(--fg-muted)',
            border: '1px solid',
            borderColor: isLiveVoice ? '#f59e0b' : 'var(--line)',
            borderRadius: '999px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
          title="Toggle Gemini Live audio spoken answers"
        >
          <Radio size={12} /> {isLiveVoice ? 'Voice Active' : 'Voice Off'}
        </button>
      </div>

      {/* Messages Scroll Thread */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: m.role === 'user' ? 'var(--blue)' : 'var(--bg-subtle)',
                color: m.role === 'user' ? 'white' : 'var(--fg)',
                border: m.role === 'user' ? 'none' : '1px solid var(--line)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                position: 'relative',
              }}
            >
              {m.text}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                color: 'var(--fg-muted)',
                padding: '0 4px',
              }}
            >
              <span>{m.timestamp}</span>
              {m.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => handleCopy(m.id, m.text)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--fg-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {copiedId === m.id ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                  <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {m.groundingQueries && m.groundingQueries.length > 0 && (
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--blue)',
                  background: 'var(--blue-tint)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '2px',
                }}
              >
                Grounded with Google Search: {m.groundingQueries.join(', ')}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '8px 12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--fg-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={14} className="pulse-dot" /> Synthesizing verified response...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div
        style={{
          padding: '6px 12px',
          background: 'var(--bg-subtle)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => handleSend('What are the top 3 global stories trending right now?')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
          }}
        >
          Top Global Stories
        </button>
        <button
          type="button"
          onClick={() => handleSend('Synthesize the latest in Artificial Intelligence today.')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
          }}
        >
          AI Digest
        </button>
      </div>

      {/* Input Box with Microphone Voice Transcription */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '10px 14px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Audio Mic Button (Transcribe with gemini-3.5-transcribe) */}
        <button
          type="button"
          onClick={handleToggleRecord}
          style={{
            background: isRecording ? '#fee2e2' : 'transparent',
            border: '1px solid',
            borderColor: isRecording ? '#ef4444' : 'var(--line)',
            color: isRecording ? '#ef4444' : 'var(--fg-muted)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title={isRecording ? 'Stop recording (Transcribing...)' : 'Voice input (gemini-3.5-transcribe)'}
        >
          {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          type="text"
          placeholder={isRecording ? 'Listening to voice...' : 'Ask about news, sectors, or facts...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--line)',
            background: 'var(--bg-subtle)',
            color: 'var(--fg)',
            fontSize: '0.88rem',
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          style={{
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            opacity: !inputText.trim() || isLoading ? 0.5 : 1,
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
