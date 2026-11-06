import { Link } from 'react-router-dom';
import { formatDate, formatPrice } from '../../services/eventService.js';

export default function ChatMessage({ message }) {
  const mine = message.from === 'user';
  return (
    <div className={`chat-msg ${mine ? 'mine' : 'bot'}`}>
      <div className="bubble">{message.text}</div>
      {message.events?.map((e) => (
        <Link key={e.id} to={`/events/${e.id}`} className="chat-event">
          <b>{e.title}</b>
          <small>{formatDate(e.date)} · {formatPrice(e.price)}</small>
        </Link>
      ))}
    </div>
  );
}
