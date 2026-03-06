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
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label>
        Category
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
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Priority
        <select
          data-testid="filter-priority"
          value={value.priority ?? ""}
          onChange={(e) => onChange({ ...value, priority: (e.target.value || undefined) as RequestPriority | undefined })}
        >
          <option value="">All</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
        <button data-testid="filter-apply" onClick={onApply}>
          Apply
        </button>
        <button data-testid="filter-reset" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
