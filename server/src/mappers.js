// Row -> JSON shapes. The frontend (src/services/*) uses camelCase, so the API speaks camelCase.

const parseJson = (s, fallback) => {
  try { return JSON.parse(s); } catch { return fallback; }
};

/** Only emit optional fields when they have a value, matching the frontend demo data. */
export function eventOut(r) {
  if (!r) return null;
  const e = {
    id: r.id,
    title: r.title,
    category: r.category,
    date: r.date,
    venue: r.venue,
    city: r.city,
    description: r.description,
    price: r.price,
    capacity: r.capacity,
    vendorId: r.vendor_id,
    cancellationPolicy: r.cancellation_policy,
    certificateAvailable: !!r.certificate_available,
  };
  const opt = {
    eventType: r.event_type, track: r.track, museumCategory: r.museum_category, college: r.college,
    branch: r.branch, instructor: r.instructor, duration: r.duration, openingHours: r.opening_hours,
    feeDetails: r.fee_details, rulesUrl: r.rules_url, teamSize: r.team_size, prizePool: r.prize_pool,
    posterUrl: r.poster_url,
  };
  Object.entries(opt).forEach(([k, v]) => { if (v) e[k] = v; });
  const topics = parseJson(r.topics, []);
  const visitorInfo = parseJson(r.visitor_info, []);
  if (topics.length) e.topics = topics;
  if (visitorInfo.length) e.visitorInfo = visitorInfo;
  return e;
}

export function bookingOut(r, extra = {}) {
  if (!r) return null;
  return {
    id: r.id,
    eventId: r.event_id,
    eventTitle: r.event_title,
    eventDate: r.event_date,
    venue: r.venue,
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email,
    qty: r.qty,
    teamName: r.team_name,
    attendees: parseJson(r.attendees, []),
    amount: r.amount,
    status: r.status,
    holdExpiresAt: r.hold_expires_at,
    createdAt: r.created_at,
    cancelledAt: r.cancelled_at ?? null,
    cancellationPolicy: r.cancellation_policy,
    reminderSet: !!r.reminder_set,
    checkedInAt: r.checked_in_at ?? null,
    ticketCode: r.ticket_code || undefined,
    paymentRef: r.payment_ref || undefined,
    ...extra,
  };
}

export function userOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    college: r.college,
    phone: r.phone,
    language: r.language,
    whatsappLinked: !!r.whatsapp_number,
    whatsappOptIn: !!r.whatsapp_opt_in,
  };
}

export function certificateOut(r) {
  return {
    id: r.id,
    bookingId: r.booking_id,
    eventId: r.event_id,
    eventTitle: r.event_title,
    userId: r.user_id,
    userName: r.user_name,
    certificateNo: r.certificate_no,
    issuedDate: r.issued_date,
  };
}

export function reviewOut(r) {
  return {
    id: r.id,
    eventId: r.event_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };
}
