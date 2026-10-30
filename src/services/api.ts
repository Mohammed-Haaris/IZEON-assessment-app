const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_BASE_URL = RAW_API_URL.replace(/\/$/, "");

// In-flight active requests cache to deduplicate simultaneous duplicate clicks
const activeInFlightRequests = new Map<string, Promise<any>>();
// Recent mutation response cache to debounce rapid clicks within 800ms
const recentMutationResponses = new Map<string, { data: any; time: number }>();
const RECENT_DEBOUNCE_WINDOW_MS = 800;

/**
 * Robust API request helper with:
 * 1. Concurrency deduplication (merges concurrent button spam clicks into a single network call)
 * 2. Rapid repeat cooldown (prevents identical mutation spam within 800ms)
 * 3. Automatic exponential backoff retry for transient network/server blips
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 1000
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = method !== "GET";

  // Build unique signature for this request
  const bodyString = typeof options.body === "string" ? options.body : "";
  const requestKey = `${method}:${endpoint}:${bodyString}`;

  if (isMutation) {
    // 1. If an identical request is already in-flight, return the existing in-flight promise
    if (activeInFlightRequests.has(requestKey)) {
      return activeInFlightRequests.get(requestKey)! as Promise<T>;
    }

    // 2. If an identical mutation completed very recently (< 800ms), return the cached response
    const recent = recentMutationResponses.get(requestKey);
    if (recent && Date.now() - recent.time < RECENT_DEBOUNCE_WINDOW_MS) {
      return recent.data as T;
    }
  }

  const executionPromise = (async () => {
    const token = localStorage.getItem("izeon_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Check for transient 502/503/504 gateway or busy server statuses
      if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return apiRequest<T>(endpoint, options, retries - 1, backoffMs * 2);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      if (isMutation) {
        recentMutationResponses.set(requestKey, { data, time: Date.now() });
        // Prune old entries after 5 minutes
        setTimeout(() => {
          recentMutationResponses.delete(requestKey);
        }, 5000);
      }

      return data as T;
    } catch (error: any) {
      // If it's a fetch network failure and retries remaining, retry
      if (retries > 0 && error.name === "TypeError" && error.message?.includes("fetch")) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return apiRequest<T>(endpoint, options, retries - 1, backoffMs * 2);
      }
      throw error;
    } finally {
      if (isMutation) {
        activeInFlightRequests.delete(requestKey);
      }
    }
  })();

  if (isMutation) {
    activeInFlightRequests.set(requestKey, executionPromise);
  }

  return executionPromise;
}
