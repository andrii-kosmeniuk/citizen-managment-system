import type { CitizenRequest } from "../types/request";

interface Props {
  requests: CitizenRequest[];
}

export function RequestList({ requests }: Props) {
  if (requests.length === 0) {
    return <p>No requests found.</p>;
  }

  return (
    <table>
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
          <tr key={item.id}>
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
