import { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage.jsx';
import Icon from '../common/Icon.jsx';
import { aiService } from '../../services/aiService.js';
import { eventService } from '../../services/eventService.js';
import { useAuth } from '../../state/AuthState.jsx';

const QUICK_PROMPTS = [
  'Which technical events are available?',
  'Find free workshops.',
  'Suggest hackathons for engineering students.',
  'Find events in Bengaluru.',
  'Recommend events based on my interests.',
  'Find events that provide certificates.',
];

export default function EventChatPanel({ onClose }) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([
    {
      from: 'bot',
      text: 'Hi! I am your TicketAI Assistant. Ask me about college hackathons, free workshops, museums, and technical events with certificates!',
    },
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async (raw) => {
    const t = raw.trim();
    if (!t || busy) return;
    setMsgs((m) => [...m, { from: 'user', text: t }]);
    setText('');
    setBusy(true);

    try {
      const r = await aiService.chat(t, user?.language || 'English', user);
      const events = r.events?.length
        ? await Promise.all(r.events.map((id) => eventService.get(id).catch(() => null)))
        : [];
      const validEvents = events.filter(Boolean);
      setMsgs((m) => [...m, { from: 'bot', text: r.text, events: validEvents }]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          from: 'bot',
          text: 'Sorry, I encountered an issue retrieving event details. Please try another query.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chat-panel card fade-up" aria-label="TicketAI assistant">
      <header className="chat-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="chat" size={20} />
          <b>TicketAI Assistant</b>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close chat">
          <Icon name="close" />
        </button>
      </header>

      <div className="chat-body">
        {msgs.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        {busy && (
          <div className="chat-msg bot">
            <div className="bubble typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="chips">
        {QUICK_PROMPTS.map((q) => (
          <button key={q} onClick={() => send(q)}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about hackathons, workshops, certificates…"
          aria-label="Message"
        />
        <button className="send" aria-label="Send" disabled={busy}>
          <Icon name="send" size={18} />
        </button>
      </form>
    </section>
  );
}
