export const inr = (n) => (Number(n) === 0 ? 'Free' : '₹' + Number(n).toLocaleString('en-IN'));

export const when = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
