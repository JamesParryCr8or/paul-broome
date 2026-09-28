type LeadWindow = Window & { fbq?: (...args: unknown[]) => void };
const sent = new Set<string>();

// Both entry points share the same submission ID and durable marker.
export function trackLeadOnce(submissionId: string, contentName: string) {
  if (!submissionId || typeof window === 'undefined') return false;
  const key = `paul_broome_lead_pixel_${submissionId}`;
  if (sent.has(key)) return false;
  try { if (window.localStorage.getItem(key)) return false; } catch {}
  const fbq = (window as LeadWindow).fbq;
  if (typeof fbq !== 'function') return false;
  fbq('track', 'Lead', { content_name: contentName }, { eventID: submissionId });
  sent.add(key);
  try { window.localStorage.setItem(key, '1'); } catch {}
  return true;
}
