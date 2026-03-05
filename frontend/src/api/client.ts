import type { CitizenRequest } from "../types/request";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function fetchRequests(): Promise<CitizenRequest[]> {
  const response = await fetch(`${API_BASE}/requests`);
  if (!response.ok) {
    throw new Error("Failed to load requests");
  }
  return response.json();
}
