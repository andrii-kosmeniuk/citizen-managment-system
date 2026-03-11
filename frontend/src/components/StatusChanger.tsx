import { useState } from "react";

import type { RequestStatus } from "../types/request";

interface Props {
  onSubmit: (status: RequestStatus, actorStaffProfileId: number, changeNote?: string) => Promise<void>;
  disabled?: boolean;
}

const STATUSES: RequestStatus[] = ["IN_PROGRESS", "CLARIFICATION_NEEDED", "RESOLVED", "CLOSED"];
const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "Neu",
  IN_PROGRESS: "In Bearbeitung",
  CLARIFICATION_NEEDED: "Rueckfrage",
  RESOLVED: "Erledigt",
  CLOSED: "Geschlossen",
};

export function StatusChanger({ onSubmit, disabled }: Props) {
  const [actorStaffProfileId, setActorStaffProfileId] = useState(1);
  const [status, setStatus] = useState<RequestStatus>("IN_PROGRESS");
  const [changeNote, setChangeNote] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(status, actorStaffProfileId, changeNote);
        setChangeNote("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      <input
        data-testid="status-actor-id"
        type="number"
        min={1}
        value={actorStaffProfileId}
        onChange={(e) => setActorStaffProfileId(Number(e.target.value))}
        placeholder="Mitarbeiterprofil-ID"
      />
      <select data-testid="status-next" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
        {STATUSES.map((nextStatus) => (
          <option key={nextStatus} value={nextStatus}>
            {STATUS_LABELS[nextStatus]}
          </option>
        ))}
      </select>
      <input
        data-testid="status-note"
        value={changeNote}
        onChange={(e) => setChangeNote(e.target.value)}
        placeholder="Aenderungsnotiz"
      />
      <button data-testid="status-submit" disabled={disabled} type="submit">
        Status aktualisieren
      </button>
    </form>
  );
}
