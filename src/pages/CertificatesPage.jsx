import { useEffect, useState } from 'react';
import LoadingState from '../components/common/LoadingState.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import Modal from '../components/common/Modal.jsx';
import { certificateService } from '../services/certificateService.js';
import { useAuth } from '../state/AuthState.jsx';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState(null);
  const [viewCert, setViewCert] = useState(null);

  useEffect(() => {
    if (user?.id) {
      certificateService.listMine(user.id).then(setCerts);
    } else {
      setCerts([]);
    }
  }, [user?.id]);

  if (!certs) return <LoadingState text="Loading your certificates…" />;

  const printCertificate = () => {
    window.print();
  };

  return (
    <>
      <div className="title-row">
        <div>
          <h2 className="page-title">My Verified Certificates</h2>
          <p className="note">Official credentials earned from workshops and college technical symposiums</p>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="card center-card" style={{ padding: '60px 20px' }}>
          <Icon name="award" size={48} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          <h3>No certificates issued yet</h3>
          <p>
            Attend workshops or college technical competitions offering certificates to earn verified credentials here.
          </p>
          <Button to="/workshops">Discover Certified Workshops</Button>
        </div>
      ) : (
        <div className="events-grid">
          {certs.map((c) => (
            <article key={c.id} className="card" style={{ padding: 22, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge-cert">
                  <Icon name="award" size={14} /> Verified Credential
                </span>
                <small className="note">{c.issuedDate}</small>
              </div>

              <h3 style={{ fontSize: 18 }}>{c.eventTitle}</h3>
              <p className="meta">
                <Icon name="user" size={14} /> Awarded to: <b>{c.userName}</b>
              </p>
              <p className="meta">
                <code style={{ fontSize: 13, background: 'var(--p-soft)', padding: '2px 6px', borderRadius: 4 }}>
                  {c.certificateNo}
                </code>
              </p>

              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={() => setViewCert(c)}>
                  View Certificate
                </Button>
                <button className="btn btn-outline btn-sm" onClick={() => setViewCert(c)}>
                  <Icon name="download" size={14} /> Download
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {viewCert && (
        <Modal open={!!viewCert} title="Verified Credential" onClose={() => setViewCert(null)}>
          <div className="cert-card">
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--p)' }}>
              <Icon name="award" size={54} />
            </div>
            <div className="cert-title">CERTIFICATE OF PARTICIPATION</div>
            <p style={{ color: 'var(--muted)', fontSize: 15 }}>This is officially presented to</p>
            <div className="cert-recipient">{viewCert.userName}</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#3C3866' }}>
              for successful participation and project completion in
              <br />
              <b>{viewCert.eventTitle}</b>
            </p>
            <div style={{ borderTop: '1px solid var(--p-line)', paddingTop: 14, marginTop: 10 }}>
              <span className="cert-code">ID: {viewCert.certificateNo}</span>
              <p className="note" style={{ marginTop: 4 }}>
                Issued on {viewCert.issuedDate} · Verified by TicketAI Credential Registry
              </p>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setViewCert(null)}>
              Close
            </Button>
            <Button icon="download" onClick={printCertificate}>
              Print / Save PDF
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

