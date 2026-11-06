import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Icon from '../../components/common/Icon.jsx';
import Button from '../../components/common/Button.jsx';
import { qrService } from '../../services/qrService.js';
import { bookingService } from '../../services/bookingService.js';
import { useAuth } from '../../state/AuthState.jsx';

export default function OrganizerScannerPage() {
  const [searchParams] = useSearchParams();
  const eventIdFilter = searchParams.get('eventId') || '';
  const { user } = useAuth();

  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [sampleBookings, setSampleBookings] = useState([]);

  useEffect(() => {
    // Load confirmed bookings so organizer can test one-click scan verification
    bookingService.listMine(user.id).then((mine) => {
      bookingService.listForVendor(user.id).then((vendorList) => {
        const allList = [...(Array.isArray(vendorList) ? vendorList : vendorList.bookings || []), ...mine];
        const confirmed = allList.filter((b) => b.status === 'CONFIRMED');
        setSampleBookings(confirmed.slice(0, 5));
      });
    }).catch(() => {});
  }, [user.id]);

  const verifyToken = async (tokenToVerify) => {
    const raw = (tokenToVerify || tokenInput).trim();
    if (!raw) return;
    setBusy(true);
    setResult(null);

    try {
      const res = await qrService.verifyAndCheckIn(raw, eventIdFilter || null);
      setResult(res);
      setRecentScans((prev) => [
        {
          token: raw,
          res,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
      if (res.valid) {
        setTokenInput('');
      }
    } catch (err) {
      setResult({
        valid: false,
        code: 'ERROR',
        message: err.message || 'Verification request failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="title-row">
        <div>
          <h2 className="page-title">Entrance QR Scanner & Verification</h2>
          <p className="note">
            Scan attendee ticket QR codes or enter signed tokens to verify entry & prevent duplicate usage.
          </p>
        </div>
        <Link to="/organizer" className="btn btn-outline btn-sm">
          Back to Dashboard
        </Link>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        {/* Scanner Viewport with Laser Animation */}
        <div className="scanner-viewport">
          <div className="scan-laser" />
          <div className="scan-target" />
          <span style={{ position: 'absolute', bottom: 14, fontSize: 13, opacity: 0.8 }}>
            <Icon name="scan" size={16} /> Ready to scan TicketAI QR codes
          </span>
        </div>

        {/* Verification Result Banner */}
        {result && (
          <div
            className={`banner ${result.valid ? 'ok' : 'bad'}`}
            style={{ marginBottom: 18, fontSize: 15 }}
            role="alert"
          >
            <div>
              <b>{result.valid ? 'ENTRY APPROVED' : `CHECK-IN REJECTED (${result.code})`}</b>
              <p style={{ marginTop: 4 }}>{result.message}</p>
              {result.attendee && (
                <p style={{ marginTop: 2, fontSize: 13 }}>
                  Attendee: <b>{result.attendee}</b>
                  {result.eventTitle && ` · ${result.eventTitle}`}
                  {result.checkedInAt && ` · Checked-in at: ${result.checkedInAt}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Manual Token Verification Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyToken();
          }}
          style={{ display: 'grid', gap: 12 }}
        >
          <label className="field">
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Scan / Paste Ticket QR Token
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. BK_X8Y9Z0.tech_hackindia.123abc456"
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !tokenInput.trim()}>
                {busy ? 'Verifying…' : 'Verify Ticket'}
              </Button>
            </div>
          </label>
        </form>

        {/* Quick Test Tokens for Demo & Evaluation */}
        {sampleBookings.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <span className="note" style={{ display: 'block', marginBottom: 8 }}>
              <b>Quick Test Tokens (from confirmed bookings):</b> Click to test check-in & duplicate detection
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sampleBookings.map((b) => {
                const sampleToken = qrService.tokenFor(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    className="discovery-pill"
                    onClick={() => {
                      setTokenInput(sampleToken);
                      verifyToken(sampleToken);
                    }}
                  >
                    <Icon name="ticket" size={13} /> {b.userName} ({b.id})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Scans Table */}
      {recentScans.length > 0 && (
        <div className="card table-card">
          <h3>Recent Entrance Scans</h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Result</th>
                <th>Attendee / Details</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.time}</td>
                  <td>
                    <span className={`badge ${s.res.valid ? 'badge-confirmed' : 'badge-bad'}`}>
                      {s.res.valid ? 'APPROVED' : s.res.code}
                    </span>
                  </td>
                  <td>{s.res.attendee || s.res.message}</td>
                  <td>
                    <code style={{ fontSize: 12 }}>{s.token.slice(0, 24)}…</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

