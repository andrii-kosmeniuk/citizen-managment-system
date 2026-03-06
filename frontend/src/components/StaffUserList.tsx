import type { StaffUser } from "../types/staff_user";

interface Props {
  staffUsers: StaffUser[];
}

export function StaffUserList({ staffUsers }: Props) {
  if (staffUsers.length === 0) {
    return <p data-testid="staff-list-empty">No workers found.</p>;
  }

  return (
    <table data-testid="staff-list-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Is Active</th>
        </tr>
      </thead>
      <tbody>
        {staffUsers.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.first_name}</td>
            <td>{user.last_name}</td>
            <td>{user.is_active ? "true" : "false"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
