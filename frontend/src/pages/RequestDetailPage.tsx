import { useEffect, useState } from "react";

import { addRequestComment, claimRequest, fetchRequestDetail, updateRequestStatus } from "../api/client";
import { CommentBox } from "../components/CommentBox";
import { StatusChanger } from "../components/StatusChanger";
import type { RequestDetailResponse, RequestStatus } from "../types/request";

interface Props {
  requestId: number | null;
  onDataChanged: () => Promise<void>;
}

export function RequestDetailPage({ requestId, onDataChanged }: Props) {
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
      const data = await fetchRequestDetail(requestId);
      setDetail(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
  }, [requestId]);

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

  const handleClaim = async () => {
    setError(null);
    try {
      await claimRequest(requestId, claimActorUserId);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStatusSubmit = async (nextStatus: RequestStatus, actorUserId: number, changeNote?: string) => {
    setError(null);
    try {
      await updateRequestStatus(requestId, actorUserId, nextStatus, changeNote);
      await loadDetail();
      await onDataChanged();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const handleCommentSubmit = async (authorUserId: number, commentText: string) => {
    setError(null);
    try {
      await addRequestComment(requestId, authorUserId, commentText);
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
        <strong>Status:</strong> {detail.request.status}
      </p>
      <p>
        <strong>Priority:</strong> {detail.request.priority}
      </p>
      <p>
        <strong>Assigned To:</strong> {detail.request.assigned_to_user_id ?? "Unassigned"}
      </p>

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
      <CommentBox onSubmit={handleCommentSubmit} disabled={isClosed} />

      <h3>Comments</h3>
      {detail.comments.length === 0 ? (
        <p>No comments.</p>
      ) : (
        <ul>
          {detail.comments.map((comment) => (
            <li key={comment.id}>
              [{new Date(comment.created_at).toLocaleString()}] User {comment.author_user_id}: {comment.comment_text}
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
              [{new Date(history.changed_at).toLocaleString()}] {history.from_status ?? "NONE"} -&gt; {history.to_status} (User {history.changed_by_user_id})
              {history.change_note ? `: ${history.change_note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
