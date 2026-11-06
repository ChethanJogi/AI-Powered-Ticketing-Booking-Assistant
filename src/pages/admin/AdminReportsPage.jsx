import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
export default function AdminReportsPage() {
 const [data,setData]=useState(null); const [error,setError]=useState('');
 useEffect(()=>{adminService.reports().then(setData).catch(e=>setError(e.message));},[]);
 return <section className="admin-resource"><div className="admin-page-heading"><div><h1>Reports & Analytics</h1><p>Platform booking and attendance summary.</p></div></div>
 {error&&<div className="admin-alert error">{error}</div>}
 {data&&<><div className="admin-info-grid">
 <div className="admin-info-card"><h3>Confirmed booking value</h3><strong className="admin-metric">₹{Number(data.totalRevenue||0).toLocaleString('en-IN')}</strong><p>Sandbox booking records, not payment settlement.</p></div>
 <div className="admin-info-card"><h3>Total check-ins</h3><strong className="admin-metric">{data.totalCheckIns}</strong></div>
 </div><div className="admin-table-wrap admin-report-table"><h2>Bookings by status</h2><table className="admin-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>{data.bookingsByStatus.map(x=><tr key={x.status}><td>{x.status}</td><td>{x.count}</td></tr>)}</tbody></table></div>
 <div className="admin-table-wrap admin-report-table"><h2>Popular events</h2><table className="admin-table"><thead><tr><th>Event</th><th>Bookings</th><th>Tickets</th></tr></thead><tbody>{data.popularEvents.map(x=><tr key={x.eventId}><td>{x.eventTitle}</td><td>{x.bookings}</td><td>{x.tickets}</td></tr>)}</tbody></table></div></>}
 </section>;
}
