import { useEffect, useState } from "react";

import { addRequestComment, claimRequest, fetchRequestDetail, updateRequestStatus } from "../api/client";
import { CommentBox } from "../components/CommentBox";
import { StatusChanger } from "../components/StatusChanger";
import type { ActorRole, RequestDetailResponse, RequestPriority, RequestStatus } from "../types/request";
import type { StaffProfile } from "../types/staff_profile";

interface Props {
  actorRole: ActorRole;
  requestId: number | null;
  selectedWorker: StaffProfile | null;
  onDataChanged: () => Promise<void>;
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "Neu",
  IN_PROGRESS: "In Bearbeitung",
  CLARIFICATION_NEEDED: "Rueckfrage",
  RESOLVED: "Erledigt",
  CLOSED: "Geschlossen",
};

const PRIORITY_LABELS: Record<RequestPriority, string> = {
  NIEDRIG: "NIEDRIG",
  MITTEL: "MITTEL",
  HOCH: "HOCH",
  KRITISCH: "KRITISCH",
};

function getCitizenDisplayName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Anonymous";
}

export function RequestDetailPage({ actorRole, requestId, selectedWorker, onDataChanged }: Props) {
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!requestId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequestDetail(actorRole, requestId);
      setDetail(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [requestId, actorRole]);

  if (!requestId) {
    return <p>Waehlen Sie ein Anliegen aus, um Details zu sehen.</p>;
  }

  if (loading) {
    return <p>Details werden geladen...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  if (!detail) {
    return <p>Keine Details gefunden.</p>;
  }

  const isClosed = detail.request.status === "CLOSED";
  const isWorker = actorRole === "worker";
  const selectedWorkerId = selectedWorker?.id ?? null;
  const selectedWorkerDisplayName = selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : null;

  const handleClaim = async () => {
    if (selectedWorkerId === null) {
      return;
    }
    setError(null);
    try {
      await claimRequest(actorRole, requestId, selectedWorkerId);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStatusSubmit = async (nextStatus: RequestStatus, actorStaffProfileId: number, changeNote?: string) => {
    setError(null);
    try {
      await updateRequestStatus(actorRole, requestId, actorStaffProfileId, nextStatus, changeNote);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const handleCommentSubmit = async (authorStaffProfileId: number | undefined, commentText: string) => {
    setError(null);
    try {
      await addRequestComment(actorRole, requestId, authorStaffProfileId, commentText);
      await loadDetail();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  return (
    <section data-testid="request-detail" style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h2>
        #{detail.request.id} {detail.request.title}
      </h2>
      <p>{detail.request.description}</p>
      <p>
        <strong>Buerger:</strong> {getCitizenDisplayName(detail.request.citizen_first_name, detail.request.citizen_last_name)}
      </p>
      <p>
        <strong>Status:</strong> {STATUS_LABELS[detail.request.status]}
      </p>
      <p>
        <strong>Prioritaet:</strong> {PRIORITY_LABELS[detail.request.priority]}
      </p>
      <p>
        <strong>Zugewiesen an:</strong>{" "}
        {detail.request.assigned_to_staff_profile_id
          ? `${detail.request.assigned_to_staff_profile_id} (${detail.request.assigned_to_display_name ?? "Unbekannter Mitarbeiter"})`
          : "Nicht zugewiesen"}
      </p>

      {isWorker && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span data-testid="claim-actor-display">
              {selectedWorkerDisplayName ? `Bearbeiter: ${selectedWorkerDisplayName}` : "Kein Mitarbeiter ausgewaehlt"}
            </span>
            <button data-testid="claim-submit" onClick={handleClaim} disabled={isClosed || selectedWorkerId === null}>
              Anliegen uebernehmen
            </button>
          </div>

          <StatusChanger
            onSubmit={handleStatusSubmit}
            actorStaffProfileId={selectedWorkerId}
            actorDisplayName={selectedWorkerDisplayName}
            disabled={isClosed}
          />
        </>
      )}
      <CommentBox
        role={actorRole}
        onSubmit={handleCommentSubmit}
        actorStaffProfileId={selectedWorkerId}
        actorDisplayName={selectedWorkerDisplayName}
        disabled={isClosed}
      />

      <h3>Kommentare</h3>
      {detail.comments.length === 0 ? (
        <p>Keine Kommentare.</p>
      ) : (
        <ul>
          {detail.comments.map((comment) => (
            <li key={comment.id}>
              [{new Date(comment.created_at).toLocaleString()}] {comment.author_display_name}
              ({comment.author_role === "CITIZEN" ? "Buerger" : "Mitarbeiter"}): {comment.comment_text}
            </li>
          ))}
        </ul>
      )}

      <h3>Statusverlauf</h3>
      {detail.status_history.length === 0 ? (
        <p>Kein Statusverlauf.</p>
      ) : (
        <ul>
          {detail.status_history.map((history) => (
            <li key={history.id}>
              [{new Date(history.changed_at).toLocaleString()}]{" "}
              {(history.from_status && STATUS_LABELS[history.from_status]) || "KEINER"} -&gt; {STATUS_LABELS[history.to_status]} (
              {history.changed_by_staff_profile_id}, {history.changed_by_display_name ?? "Unbekannter Mitarbeiter"})
              {history.change_note ? `: ${history.change_note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
