export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.startsWith("192.168."))
    ? "http://localhost:5000"
    : "https://rayhar-staff.onrender.com");

export const STORAGE_ACTIVE_COMPANY_KEY = 'rayhar_active_company_id';

export function getActiveCompanyId(): string {
  if (typeof window === 'undefined') return '1';
  return (
    sessionStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) ||
    localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) ||
    '1'
  );
}

// Global fetch interceptor to automatically attach X-Company-Id and company_id query param
if (typeof window !== 'undefined' && !((window as any).__rayhar_fetch_interceptor_installed)) {
  (window as any).__rayhar_fetch_interceptor_installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // Only intercept requests directed to our backend API endpoints
      if (url && (url.includes('/api/') || (API_BASE_URL && url.startsWith(API_BASE_URL)))) {
        const activeCompanyId = getActiveCompanyId();

        init = init ? { ...init } : {};
        const headers = new Headers(init.headers || {});

        // Check if URL specifies explicit company_id query parameter
        let targetCompanyId = activeCompanyId;
        try {
          const urlObj = new URL(url, window.location.origin);
          const qCid = urlObj.searchParams.get('company_id') || urlObj.searchParams.get('companyId');
          if (qCid) {
            targetCompanyId = qCid;
          }
        } catch (_) {}

        if (!headers.has('X-Company-Id')) {
          headers.set('X-Company-Id', targetCompanyId);
        }

        // Attach Operator identity for system audit logging
        if (!headers.has('X-Operator-Name')) {
          try {
            const rawUser = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              const opName = u.full_name || u.name || sessionStorage.getItem('presence_cached_name') || 'HR Admin';
              const opRole = u.role || sessionStorage.getItem('presence_cached_role') || 'hr_admin';
              const opId = String(u.id || u.user_id || 'system');
              headers.set('X-Operator-Name', encodeURIComponent(opName));
              headers.set('X-Operator-Role', encodeURIComponent(opRole));
              headers.set('X-Operator-Id', opId);
            }
          } catch (_) {}
        }

        init.headers = headers;

        // For GET requests that do not already have company_id or companyId, append it
        const method = (init.method || 'GET').toUpperCase();
        if (method === 'GET' && !url.includes('company_id=') && !url.includes('companyId=')) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}company_id=${encodeURIComponent(targetCompanyId)}`;
        }

        return originalFetch(url, init);
      }
    } catch (e) {
      console.warn('Fetch interceptor error:', e);
    }

    return originalFetch(input, init);
  };

  // Also intercept EventSource (SSE) so /api/ streams automatically carry company_id
  if (typeof window.EventSource !== 'undefined') {
    const OriginalEventSource = window.EventSource;
    const PatchedEventSource = function (url: string | URL, eventSourceInitDict?: EventSourceInit) {
      let urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr && (urlStr.includes('/api/') || (API_BASE_URL && urlStr.startsWith(API_BASE_URL)))) {
        if (!urlStr.includes('company_id=') && !urlStr.includes('companyId=')) {
          const activeCompanyId = getActiveCompanyId();
          const separator = urlStr.includes('?') ? '&' : '?';
          urlStr = `${urlStr}${separator}company_id=${encodeURIComponent(activeCompanyId)}`;
        }
      }
      return new OriginalEventSource(urlStr, eventSourceInitDict);
    } as unknown as typeof EventSource;
    PatchedEventSource.prototype = OriginalEventSource.prototype;
    (PatchedEventSource as any).CONNECTING = OriginalEventSource.CONNECTING;
    (PatchedEventSource as any).OPEN = OriginalEventSource.OPEN;
    (PatchedEventSource as any).CLOSED = OriginalEventSource.CLOSED;
    window.EventSource = PatchedEventSource;
  }
}
