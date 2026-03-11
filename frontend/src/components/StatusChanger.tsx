import { useState } from "react";

import type { RequestStatus } from "../types/request";

interface Props {
  onSubmit: (status: RequestStatus, actorStaffProfileId: number, changeNote?: string) => Promise<void>;
  actorStaffProfileId: number | null;
  actorDisplayName: string | null;
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

export function StatusChanger({ onSubmit, actorStaffProfileId, actorDisplayName, disabled }: Props) {
  const [status, setStatus] = useState<RequestStatus>("IN_PROGRESS");
  const [changeNote, setChangeNote] = useState("");
  const isSubmitDisabled = disabled || actorStaffProfileId === null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (actorStaffProfileId === null) {
          return;
        }
        await onSubmit(status, actorStaffProfileId, changeNote);
        setChangeNote("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      <span data-testid="status-actor-display">
        {actorDisplayName ? `Bearbeiter: ${actorDisplayName}` : "Kein Mitarbeiter ausgewaehlt"}
      </span>
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
      <button data-testid="status-submit" disabled={isSubmitDisabled} type="submit">
        Status aktualisieren
      </button>
    </form>
  );
}
