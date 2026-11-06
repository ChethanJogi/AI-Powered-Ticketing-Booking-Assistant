import { useEffect, useState } from 'react';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../state/AuthState.jsx';
import { whatsappService } from '../services/whatsappService.js';

function WhatsAppCard() {
  const [st, setSt] = useState(null);
  const [link, setLink] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => whatsappService.status().then(setSt).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  // While a code is showing, poll so the card flips to "Connected" as soon as the user sends it.
  useEffect(() => {
    if (!link || st?.linked) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [link, st?.linked]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!whatsappService.available) {
    return (
      <div className="card auth-card wide" style={{ marginTop: 16 }}>
        <h3>WhatsApp</h3>
        <p className="note">WhatsApp tickets and the booking bot work when the app is connected to the backend (set VITE_API_URL).</p>
      </div>
    );
  }
  if (!st) return null;

  const waLink = st.botNumber ? `https://wa.me/${st.botNumber}?text=${encodeURIComponent(link ? `LINK ${link.code}` : 'Hi')}` : null;

  return (
    <div className="card auth-card wide" style={{ marginTop: 16 }}>
      <h3>WhatsApp</h3>
      {!st.enabled && <p className="note">WhatsApp is not switched on for this server yet.</p>}

      {st.enabled && st.linked && (
        <>
          <p className="note ok">Connected to {st.number}. Tickets, refunds and reminders arrive on WhatsApp.</p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
            <input type="checkbox" checked={st.optIn} disabled={busy} onChange={(e) => run(() => whatsappService.setOptIn(e.target.checked))} />
            Send me ticket and reminder messages
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {waLink && <Button variant="outline" size="sm" onClick={() => window.open(waLink, '_blank')}>Open chat</Button>}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(async () => { await whatsappService.unlink(); setLink(null); })}>Disconnect</Button>
          </div>
        </>
      )}

      {st.enabled && !st.linked && (
        <>
          <p className="note">Connect your WhatsApp to get your QR ticket as a message, ask the bot for events, and manage bookings by chat.</p>
          {!link && <Button disabled={busy} onClick={() => run(async () => setLink(await whatsappService.createLinkCode()))}>Get link code</Button>}
          {link && (
            <div style={{ marginTop: 10 }}>
              <p>Send this message on WhatsApp{st.botNumber ? ` to +${st.botNumber}` : ''} within 10 minutes:</p>
              <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}><code>{link.message}</code></p>
              {waLink && <Button variant="outline" size="sm" onClick={() => window.open(waLink, '_blank')}>Open WhatsApp</Button>}
            </div>
          )}
        </>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [v, setV] = useState({ name: user.name, phone: user.phone || '', language: user.language || 'English' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => { setSaved(false); setError(''); setV({ ...v, [k]: e.target.value }); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(v);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <form className="card auth-card wide" onSubmit={submit}>
        <h2>Your profile</h2>
        <Input label="Full name" value={v.name} onChange={set('name')} required />
        <Input label="Email" value={user.email} disabled />
        <Input label="Phone" value={v.phone} onChange={set('phone')} placeholder="For booking lookups" />
        <Input label="Preferred language" as="select" value={v.language} onChange={set('language')}>
          <option>English</option><option>Hindi</option><option>Kannada</option>
        </Input>
        <Button type="submit">Save changes</Button>
        {saved && <p className="note ok">Saved.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </form>
      <WhatsAppCard />
    </>
  );
}
