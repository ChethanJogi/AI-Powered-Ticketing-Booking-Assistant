import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
export default function AdminAuditPage() {
 const [rows,setRows]=useState([]); const [error,setError]=useState('');
 useEffect(()=>{adminService.audit().then(setRows).catch(e=>setError(e.message));},[]);
 return <section className="admin-resource"><div className="admin-page-heading"><div><h1>Admin Audit Log</h1><p>Recent changes performed through the Admin Control Panel.</p></div></div>
 {error&&<div className="admin-alert error">{error}</div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
 <tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.createdAt).toLocaleString('en-IN')}</td><td>{x.adminName}</td><td>{x.action}</td><td>{x.targetType}: {x.targetId}</td><td>{x.details||'—'}</td></tr>)}
 {!rows.length&&<tr><td colSpan="5" className="admin-empty">No administrative actions recorded yet.</td></tr>}</tbody></table></div></section>;
}
