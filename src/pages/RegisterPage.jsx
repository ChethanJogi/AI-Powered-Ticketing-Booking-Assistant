import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { useAuth } from '../state/AuthState.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ name: '', email: '', password: '', role: 'user', college: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (v.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    setError('');
    try {
      await register(v);
      navigate(v.role === 'organizer' ? '/organizer' : '/events', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Create your account</h2>
      <Input label="Full name" value={v.name} onChange={set('name')} required />
      <Input label="Email" type="email" value={v.email} onChange={set('email')} required />
      <Input label="Password" type="password" value={v.password} onChange={set('password')} required />
      <Input label="I want to" as="select" value={v.role} onChange={set('role')}>
        <option value="user">Discover & Book tickets (student/attendee)</option>
        <option value="organizer">Host college technical events & symposiums (organizer)</option>
        <option value="vendor">Sell commercial event tickets (vendor)</option>
      </Input>
      {v.role === 'organizer' && (
        <Input
          label="College / Institution"
          value={v.college}
          onChange={set('college')}
          placeholder="e.g. RV College of Engineering"
          required
        />
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" full disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </Button>
      <p className="auth-links">
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      </p>
    </form>
  );
}
