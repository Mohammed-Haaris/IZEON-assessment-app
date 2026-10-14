const RAW_API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_BASE_URL = RAW_API_URL.replace(/\/$/, "");

/**
 * Robust API request helper with automatic exponential backoff retry for network/server blips.
 * Prevents 1000 students from experiencing failures during peak simultaneous submissions.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 1000
): Promise<T> {
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

    return data;
  } catch (error: any) {
    // If it's a fetch network failure and retries remaining, retry
    if (retries > 0 && error.name === "TypeError" && error.message.includes("fetch")) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return apiRequest<T>(endpoint, options, retries - 1, backoffMs * 2);
    }
    throw error;
  }
}
