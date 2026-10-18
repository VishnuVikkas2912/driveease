const BASE = import.meta.env.VITE_API_URL || '/api';
export async function api(path, { method = 'GET', body, token, signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 && token) window.dispatchEvent(new Event('session-expired'));
      throw new Error(
        data.message ||
          (r.status >= 500
            ? 'DriveEase is temporarily unavailable. Try again.'
            : 'Could not complete this request. Try again.'),
      );
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' && !signal?.aborted)
      throw new Error('The request took too long. Try again.');
    if (error instanceof TypeError)
      throw new Error('Cannot reach DriveEase. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
