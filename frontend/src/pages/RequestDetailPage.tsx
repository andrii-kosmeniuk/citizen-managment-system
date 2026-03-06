import { useEffect, useState } from "react";

import { addRequestComment, claimRequest, fetchRequestDetail, updateRequestStatus } from "../api/client";
import { CommentBox } from "../components/CommentBox";
import { StatusChanger } from "../components/StatusChanger";
import type { ActorRole, RequestDetailResponse, RequestStatus } from "../types/request";

interface Props {
  actorRole: ActorRole;
  requestId: number | null;
  onDataChanged: () => Promise<void>;
}

export function RequestDetailPage({ actorRole, requestId, onDataChanged }: Props) {
  const [detail, setDetail] = useState<RequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimActorUserId, setClaimActorUserId] = useState(1);

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
    return <p>Select a request to view details.</p>;
  }

  if (loading) {
    return <p>Loading request detail...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  if (!detail) {
    return <p>No detail found.</p>;
  }

  const isClosed = detail.request.status === "CLOSED";
  const isWorker = actorRole === "worker";

  const handleClaim = async () => {
    setError(null);
    try {
      await claimRequest(actorRole, requestId, claimActorUserId);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStatusSubmit = async (nextStatus: RequestStatus, actorUserId: number, changeNote?: string) => {
    setError(null);
    try {
      await updateRequestStatus(actorRole, requestId, actorUserId, nextStatus, changeNote);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const handleCommentSubmit = async (authorUserId: number | undefined, commentText: string) => {
    setError(null);
    try {
      await addRequestComment(actorRole, requestId, authorUserId, commentText);
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
        <strong>Citizen:</strong> {detail.request.citizen_first_name} {detail.request.citizen_last_name}
      </p>
      <p>
        <strong>Status:</strong> {detail.request.status}
      </p>
      <p>
        <strong>Priority:</strong> {detail.request.priority}
      </p>
      <p>
        <strong>Assigned To:</strong>{" "}
        {detail.request.assigned_to_user_id
          ? `${detail.request.assigned_to_user_id}(${detail.request.assigned_to_display_name ?? "Unknown Worker"})`
          : "Unassigned"}
      </p>

      {isWorker && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              data-testid="claim-actor-id"
              type="number"
              min={1}
              value={claimActorUserId}
              onChange={(e) => setClaimActorUserId(Number(e.target.value))}
            />
            <button data-testid="claim-submit" onClick={handleClaim} disabled={isClosed}>
              Claim Request
            </button>
          </div>

          <StatusChanger onSubmit={handleStatusSubmit} disabled={isClosed} />
        </>
      )}
      <CommentBox role={actorRole} onSubmit={handleCommentSubmit} disabled={isClosed} />

      <h3>Comments</h3>
      {detail.comments.length === 0 ? (
        <p>No comments.</p>
      ) : (
        <ul>
          {detail.comments.map((comment) => (
            <li key={comment.id}>
              [{new Date(comment.created_at).toLocaleString()}] {comment.author_display_name}
              ({comment.author_role === "CITIZEN" ? "Citizen" : "Worker"}): {comment.comment_text}
            </li>
          ))}
        </ul>
      )}

      <h3>Status History</h3>
      {detail.status_history.length === 0 ? (
        <p>No status history.</p>
      ) : (
        <ul>
          {detail.status_history.map((history) => (
            <li key={history.id}>
              [{new Date(history.changed_at).toLocaleString()}] {history.from_status ?? "NONE"} -&gt; {history.to_status} (
              {history.changed_by_user_id}, {history.changed_by_display_name ?? "Unknown Worker"})
              {history.change_note ? `: ${history.change_note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
