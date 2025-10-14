export function toRegistrableDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;
  const last = parts.pop();
  const secondLast = parts.pop();
  return `${secondLast}.${last}`;
}

export function matchesExcludedDomain(hostname, excluded) {
  if (!hostname || !Array.isArray(excluded)) return false;
  return excluded.some((domain) => {
    if (!domain) return false;
    const normalized = domain.trim().toLowerCase();
    if (!normalized) return false;
    if (hostname === normalized) return true;
    return hostname.endsWith(`.${normalized}`);
  });
}
