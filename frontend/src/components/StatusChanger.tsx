import { useState } from "react";

import type { RequestStatus } from "../types/request";

interface Props {
  onSubmit: (status: RequestStatus, actorUserId: number, changeNote?: string) => Promise<void>;
  disabled?: boolean;
}

const STATUSES: RequestStatus[] = ["IN_PROGRESS", "CLARIFICATION_NEEDED", "RESOLVED", "CLOSED"];

export function StatusChanger({ onSubmit, disabled }: Props) {
  const [actorUserId, setActorUserId] = useState(1);
  const [status, setStatus] = useState<RequestStatus>("IN_PROGRESS");
  const [changeNote, setChangeNote] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(status, actorUserId, changeNote);
        setChangeNote("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      <input
        data-testid="status-actor-id"
        type="number"
        min={1}
        value={actorUserId}
        onChange={(e) => setActorUserId(Number(e.target.value))}
        placeholder="Actor User ID"
      />
      <select data-testid="status-next" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
        {STATUSES.map((nextStatus) => (
          <option key={nextStatus} value={nextStatus}>
            {nextStatus}
          </option>
        ))}
      </select>
      <input
        data-testid="status-note"
        value={changeNote}
        onChange={(e) => setChangeNote(e.target.value)}
        placeholder="Change note"
      />
      <button data-testid="status-submit" disabled={disabled} type="submit">
        Update Status
      </button>
    </form>
  );
}
