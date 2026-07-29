import { customFetch } from "@workspace/api-client-react/custom-fetch";

export async function apiRequest<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };
  return customFetch<T>(path, { ...options, headers });
}

export default apiRequest;
