/**
 * Resilient & Secure API Client with native httpOnly cookie authentication
 * and partitioned iframe support
 */

let sessionInitialized = false;

/**
 * Proactively initialize server session via httpOnly cookie
 */
export async function initApiSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/init-session", {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      sessionInitialized = true;
      return true;
    }
  } catch (err) {
    console.warn("Session init notice:", err);
  }
  return false;
}

/**
 * Authenticated Fetch wrapper relying strictly on secure httpOnly cookies
 * with automatic session initialization and transparent 401 retry
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!sessionInitialized) {
    await initApiSession().catch(() => {});
  }

  const enhancedInit: RequestInit = {
    ...init,
    credentials: "include",
  };

  let response = await fetch(input, enhancedInit);

  // Auto-recovery on 401: re-initialize session and retry once
  if (response.status === 401) {
    console.warn("Session expired or invalid, auto-refreshing session...");
    const reinitSuccess = await initApiSession();
    if (reinitSuccess) {
      response = await fetch(input, enhancedInit);
    }
  }

  return response;
}

