export interface StaffProfile {
  id: number;
  person_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  employee_code: string;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
