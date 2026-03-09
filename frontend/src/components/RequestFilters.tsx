import type { Category } from "../types/category";
import type { RequestPriority, RequestStatus } from "../types/request";

interface Filters {
  status?: RequestStatus;
  category_id?: number;
  priority?: RequestPriority;
}

interface Props {
  categories: Category[];
  value: Filters;
  onChange: (next: Filters) => void;
  onApply: () => void;
  onReset: () => void;
}

const STATUSES: RequestStatus[] = ["NEW", "IN_PROGRESS", "CLARIFICATION_NEEDED", "RESOLVED", "CLOSED"];
const PRIORITIES: RequestPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "Neu",
  IN_PROGRESS: "In Bearbeitung",
  CLARIFICATION_NEEDED: "Rueckfrage",
  RESOLVED: "Erledigt",
  CLOSED: "Geschlossen",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
  CRITICAL: "Kritisch",
};

export function RequestFilters({ categories, value, onChange, onApply, onReset }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
      <label>
        Status
        <select
          data-testid="filter-status"
          value={value.status ?? ""}
          onChange={(e) => onChange({ ...value, status: (e.target.value || undefined) as RequestStatus | undefined })}
        >
          <option value="">Alle</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Kategorie
        <select
          data-testid="filter-category"
          value={value.category_id ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              category_id: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">Alle</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Prioritaet
        <select
          data-testid="filter-priority"
          value={value.priority ?? ""}
          onChange={(e) => onChange({ ...value, priority: (e.target.value || undefined) as RequestPriority | undefined })}
        >
          <option value="">Alle</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
        <button data-testid="filter-apply" onClick={onApply}>
          Anwenden
        </button>
        <button data-testid="filter-reset" onClick={onReset}>
          Zuruecksetzen
        </button>
      </div>
    </div>
  );
}
