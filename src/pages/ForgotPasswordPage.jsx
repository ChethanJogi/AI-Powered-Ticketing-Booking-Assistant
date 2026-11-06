import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { setResult(await authService.forgotPassword(email)); }
    catch (err) { setResult({ message: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Forgot password</h2>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" full disabled={busy}>Send reset link</Button>
      {result && <p className="note ok">{result.message}</p>}
      {result?.demoToken && <p className="note">Demo mode: <Link to={`/reset-password?token=${encodeURIComponent(result.demoToken)}`}>open the reset page</Link></p>}
      <p className="auth-links"><Link to="/login">Back to log in</Link></p>
    </form>
  );
}
