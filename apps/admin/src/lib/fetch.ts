export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

/**
 * A proxy fetch instance that automatically routes requests to the backend server.
 * This simplifies fetch calls by avoiding the need to prepend BACKEND_URL everywhere.
 * Usage: backendFetch('/api/admin/bootstrap')
 */
export async function backendFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // If the input is a relative path starting with '/', prepend the BACKEND_URL
  let url = input instanceof URL ? input.toString() : typeof input === 'string' ? input : input.url;
  
  if (url.startsWith('/')) {
    url = `${BACKEND_URL.replace(/\/$/, '')}${url}`;
  }

  // If input was a Request object, we create a new Request to avoid mutating it
  // and handle custom initialization
  const requestInit = { ...init };
  
  if (input instanceof Request) {
    // Copy the original request properties that are not overridden in init
    requestInit.method = init?.method ?? input.method;
    requestInit.headers = init?.headers ?? new Headers(input.headers);
    requestInit.credentials = init?.credentials ?? input.credentials;
    requestInit.cache = init?.cache ?? input.cache;
    requestInit.mode = init?.mode ?? input.mode;
    requestInit.redirect = init?.redirect ?? input.redirect;
    requestInit.referrer = init?.referrer ?? input.referrer;
    requestInit.referrerPolicy = init?.referrerPolicy ?? input.referrerPolicy;
    requestInit.integrity = init?.integrity ?? input.integrity;
    requestInit.keepalive = init?.keepalive ?? input.keepalive;
    requestInit.signal = init?.signal ?? input.signal;
    
    // We only copy body if it's not a GET/HEAD request
    if (requestInit.method !== 'GET' && requestInit.method !== 'HEAD') {
      requestInit.body = init?.body ?? input.body;
    }
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_auth_token');
    if (token) {
      requestInit.headers = new Headers(requestInit.headers);
      requestInit.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  requestInit.credentials = 'omit';

  return fetch(url, requestInit);
}
