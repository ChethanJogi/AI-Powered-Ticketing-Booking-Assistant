import { useState } from 'react';
import EventChatPanel from './EventChatPanel.jsx';
import Icon from '../common/Icon.jsx';

export default function EventChatButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <EventChatPanel onClose={() => setOpen(false)} />}
      {!open && (
        <button className="ask-ai" onClick={() => setOpen(true)} aria-label="Ask AI">
          <Icon name="chat" size={22} /> Ask AI <Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} />
          <i className="online" />
        </button>
      )}
    </>
  );
}
