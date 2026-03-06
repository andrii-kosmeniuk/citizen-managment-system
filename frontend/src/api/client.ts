import type { Category } from "../types/category";
import type {
  ActorRole,
  CitizenRequest,
  CreateRequestPayload,
  RequestDetailResponse,
  RequestPriority,
  RequestStatus,
} from "../types/request";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface RequestFilterParams {
  status?: RequestStatus;
  category_id?: number;
  priority?: RequestPriority;
}

function headersFor(role: ActorRole): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Actor-Role": role,
  };
}

async function fetchJson<T>(url: string, role: ActorRole, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: headersFor(role),
    ...options,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) {
        detail = String(body.error.message);
      } else if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // Keep fallback detail.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchRequests(role: ActorRole, filters?: RequestFilterParams): Promise<CitizenRequest[]> {
  const query = new URLSearchParams();
  if (filters?.status) query.set("status", filters.status);
  if (filters?.category_id) query.set("category_id", String(filters.category_id));
  if (filters?.priority) query.set("priority", filters.priority);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchJson<CitizenRequest[]>(`${API_BASE}/requests${suffix}`, role);
}

export async function fetchRequestDetail(role: ActorRole, requestId: number): Promise<RequestDetailResponse> {
  return fetchJson<RequestDetailResponse>(`${API_BASE}/requests/${requestId}`, role);
}

export async function fetchCategories(role: ActorRole, activeOnly = true): Promise<Category[]> {
  return fetchJson<Category[]>(`${API_BASE}/categories?active_only=${activeOnly}`, role);
}

export async function createRequest(role: ActorRole, payload: CreateRequestPayload): Promise<CitizenRequest> {
  return fetchJson<CitizenRequest>(`${API_BASE}/requests`, role, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function claimRequest(role: ActorRole, requestId: number, actorUserId: number): Promise<CitizenRequest> {
  return fetchJson<CitizenRequest>(`${API_BASE}/requests/${requestId}/claim`, role, {
    method: "POST",
    body: JSON.stringify({ actor_user_id: actorUserId }),
  });
}

export async function updateRequestStatus(
  role: ActorRole,
  requestId: number,
  actorUserId: number,
  toStatus: RequestStatus,
  changeNote?: string,
): Promise<CitizenRequest> {
  return fetchJson<CitizenRequest>(`${API_BASE}/requests/${requestId}/status`, role, {
    method: "PATCH",
    body: JSON.stringify({ actor_user_id: actorUserId, to_status: toStatus, change_note: changeNote || null }),
  });
}

export async function addRequestComment(
  role: ActorRole,
  requestId: number,
  authorUserId: number,
  commentText: string,
): Promise<void> {
  await fetchJson(`${API_BASE}/requests/${requestId}/comments`, role, {
    method: "POST",
    body: JSON.stringify({ author_user_id: authorUserId, comment_text: commentText }),
  });
}

export async function createCategory(role: ActorRole, name: string, description?: string): Promise<Category> {
  return fetchJson<Category>(`${API_BASE}/categories`, role, {
    method: "POST",
    body: JSON.stringify({ name, description: description || null }),
  });
}
