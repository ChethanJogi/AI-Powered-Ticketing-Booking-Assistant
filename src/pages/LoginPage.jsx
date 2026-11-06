import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import { useAuth } from '../state/AuthState.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      if (u.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (u.role === 'organizer') {
        navigate('/organizer', { replace: true });
      } else if (u.role === 'vendor') {
        navigate('/vendor', { replace: true });
      } else {
        navigate(location.state?.from || '/events', { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const fillDemo = (mail, pass = 'demo123') => {
    setEmail(mail);
    setPassword(pass);
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Welcome back to TicketAI</h2>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" full disabled={busy}>
        {busy ? 'Signing in…' : 'Log in'}
      </Button>
      <p className="auth-links">
        <Link to="/forgot-password">Forgot password?</Link>
        <span>
          New here? <Link to="/register">Create account</Link>
        </span>
      </p>

      <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <p className="note" style={{ marginBottom: 8 }}>
          <b>Quick Demo Logins:</b>
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="discovery-pill"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => fillDemo('demo@ticketai.in')}
          >
            <Icon name="user" size={12} /> Student User
          </button>
          <button
            type="button"
            className="discovery-pill"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => fillDemo('organizer@ticketai.in')}
          >
            <Icon name="code" size={12} /> College Organizer
          </button>
          <button
            type="button"
            className="discovery-pill"
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => fillDemo('vendor@ticketai.in')}
          >
            <Icon name="ticket" size={12} /> Vendor
          </button>
        </div>
      </div>
    </form>
  );
}
