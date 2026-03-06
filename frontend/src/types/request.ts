export type RequestStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "CLARIFICATION_NEEDED"
  | "RESOLVED"
  | "CLOSED";

export type RequestPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ActorRole = "citizen" | "worker";

export interface CitizenRequest {
  id: number;
  title: string;
  description: string;
  category_id: number;
  priority: RequestPriority;
  status: RequestStatus;
  citizen_first_name: string;
  citizen_last_name: string;
  assigned_to_user_id?: number | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestStatusHistoryItem {
  id: number;
  request_id: number;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  changed_by_user_id: number;
  change_note?: string | null;
  changed_at: string;
}

export interface RequestCommentItem {
  id: number;
  request_id: number;
  author_user_id: number;
  comment_text: string;
  created_at: string;
}

export interface RequestDetailResponse {
  request: CitizenRequest;
  comments: RequestCommentItem[];
  status_history: RequestStatusHistoryItem[];
}

export interface CreateRequestPayload {
  creator_user_id: number;
  title: string;
  description: string;
  category_id: number;
  priority: RequestPriority;
  citizen_first_name: string;
  citizen_last_name: string;
}
