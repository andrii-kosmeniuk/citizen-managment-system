import type { CitizenRequest } from "../types/request";

interface Props {
  requests: CitizenRequest[];
  selectedRequestId: number | null;
  onSelect: (requestId: number) => void;
}

export function RequestList({ requests, selectedRequestId, onSelect }: Props) {
  if (requests.length === 0) {
    return <p>No requests found.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
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
            <td>{item.status}</td>
            <td>{item.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
