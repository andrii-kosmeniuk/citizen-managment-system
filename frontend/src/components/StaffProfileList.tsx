import type { StaffProfile } from "../types/staff_profile";

interface Props {
  staffProfiles: StaffProfile[];
}

export function StaffProfileList({ staffProfiles }: Props) {
  if (staffProfiles.length === 0) {
    return <p data-testid="staff-list-empty">Keine Mitarbeiter gefunden.</p>;
  }

  return (
    <table data-testid="staff-list-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Vorname</th>
          <th>Nachname</th>
          <th>Personalcode</th>
          <th>Aktiv</th>
          <th>Verfuegbar</th>
        </tr>
      </thead>
      <tbody>
        {staffProfiles.map((profile) => (
          <tr key={profile.id}>
            <td>{profile.id}</td>
            <td>{profile.first_name}</td>
            <td>{profile.last_name}</td>
            <td>{profile.employee_code}</td>
            <td>{profile.is_active ? "Ja" : "Nein"}</td>
            <td>{profile.is_available ? "Ja" : "Nein"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
