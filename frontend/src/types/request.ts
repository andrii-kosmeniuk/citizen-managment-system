export type RequestStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "CLARIFICATION_NEEDED"
  | "RESOLVED"
  | "CLOSED";

export type RequestPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CitizenRequest {
  id: number;
  title: string;
  description: string;
  category_id: number;
  priority: RequestPriority;
  status: RequestStatus;
  citizen_name?: string | null;
  assigned_to_user_id?: number | null;
  created_at: string;
  updated_at: string;
}
