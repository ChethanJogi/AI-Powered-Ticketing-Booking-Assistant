import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
export default function AdminScannerPage() {
 const [token,setToken]=useState(''); const [eventId,setEventId]=useState('');
 const [bookings,setBookings]=useState([]); const [result,setResult]=useState(null);
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 useEffect(()=>{adminService.bookings().then(x=>setBookings(x.filter(b=>b.status==='CONFIRMED'&&b.ticketToken))).catch(e=>setError(e.message));},[]);
 const verify=async(value=token)=>{if(!value.trim())return;setBusy(true);setResult(null);setError('');
  try{const r=await adminService.verifyTicket(value.trim(),eventId||null);setResult(r);if(r.valid)setToken('');}
  catch(e){setError(e.message||'Ticket verification failed');}finally{setBusy(false);}};
 return <section className="admin-resource"><div className="admin-page-heading"><div><h1>Global QR Ticket Scanner</h1><p>Admin can verify tickets for any event. Duplicate check-ins remain blocked.</p></div><span className="admin-date-label">ALL EVENTS</span></div>
 <div className="admin-scanner-card"><div className="admin-scanner-icon">⌗</div><h2>Verify attendee ticket</h2>
 <p>This version accepts the signed ticket token pasted from a QR reader. Camera-based scanning is not included.</p>
 <form onSubmit={e=>{e.preventDefault();verify();}} className="admin-scanner-form">
 <label>Optional event ID filter<input value={eventId} onChange={e=>setEventId(e.target.value)} placeholder="Leave blank to allow all events"/></label>
 <label>Signed QR token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste the signed TicketAI QR token" /></label>
 <button className="admin-button primary" disabled={busy||!token.trim()}>{busy?'Verifying…':'Verify ticket & check in'}</button></form>
 {result&&<div className={`admin-alert ${result.valid?'success':'error'}`}><b>{result.valid?'ENTRY APPROVED':`CHECK-IN REJECTED · ${result.code}`}</b><p>{result.message}</p>{result.attendee&&<p>Attendee: {result.attendee} · {result.eventTitle||''}</p>}</div>}
 {error&&<div className="admin-alert error">{error}</div>}</div>
 <div className="admin-table-wrap"><h2>Quick test tokens from confirmed bookings</h2><table className="admin-table"><thead><tr><th>Booking</th><th>Attendee</th><th>Event</th><th>Action</th></tr></thead><tbody>
 {bookings.slice(0,20).map(b=><tr key={b.id}><td>{b.id}</td><td>{b.userName}</td><td>{b.eventTitle}</td><td><button className="admin-button" disabled={busy} onClick={()=>{setToken(b.ticketToken);verify(b.ticketToken);}}>Verify</button></td></tr>)}
 {!bookings.length&&<tr><td colSpan="4" className="admin-empty">No confirmed bookings available for quick testing.</td></tr>}</tbody></table></div>
 </section>;
}
