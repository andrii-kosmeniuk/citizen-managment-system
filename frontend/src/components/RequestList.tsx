import type { CitizenRequest } from "../types/request";
import type { RequestPriority, RequestStatus } from "../types/request";

interface Props {
  requests: CitizenRequest[];
  selectedRequestId: number | null;
  onSelect: (requestId: number) => void;
}

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

export function RequestList({ requests, selectedRequestId, onSelect }: Props) {
  if (requests.length === 0) {
    return <p>Keine Anliegen gefunden.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Titel</th>
          <th>Buerger</th>
          <th>Status</th>
          <th>Prioritaet</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((item) => (
          <tr
            key={item.id}
            data-testid={`request-row-${item.id}`}
            onClick={() => onSelect(item.id)}
            style={{
              cursor: "pointer",
              background: selectedRequestId === item.id ? "#eef6ff" : "transparent",
            }}
          >
            <td>{item.id}</td>
            <td>{item.title}</td>
            <td>
              {item.citizen_first_name} {item.citizen_last_name}
            </td>
            <td>{STATUS_LABELS[item.status]}</td>
            <td>{PRIORITY_LABELS[item.priority]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
