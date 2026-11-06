import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    try { await authService.resetPassword(params.get('token') || '', password); setDone(true); }
    catch (err) { setError(err.message); }
  };

  if (done) return <div className="card auth-card"><h2>Password updated</h2><Button to="/login" full>Log in</Button></div>;
  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Set a new password</h2>
      <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="field-error" role="alert">{error}</p>}
      <Button type="submit" full>Update password</Button>
      <p className="auth-links"><Link to="/login">Back to log in</Link></p>
    </form>
  );
}
