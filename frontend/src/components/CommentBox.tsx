import { useState } from "react";

interface Props {
  role: "citizen" | "worker";
  onSubmit: (authorStaffProfileId: number | undefined, commentText: string) => Promise<void>;
  actorStaffProfileId?: number | null;
  actorDisplayName?: string | null;
  disabled?: boolean;
}

export function CommentBox({ role, onSubmit, actorStaffProfileId, actorDisplayName, disabled }: Props) {
  const [commentText, setCommentText] = useState("");
  const isWorker = role === "worker";
  const isSubmitDisabled = disabled || (isWorker && !actorStaffProfileId);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(isWorker ? actorStaffProfileId ?? undefined : undefined, commentText);
        setCommentText("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      {isWorker && (
        <span data-testid="comment-actor-display">
          {actorDisplayName ? `Kommentar als: ${actorDisplayName}` : "Kein Mitarbeiter ausgewaehlt"}
        </span>
      )}
      <input
        data-testid="comment-text"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Kommentar hinzufuegen"
      />
      <button data-testid="comment-submit" disabled={isSubmitDisabled} type="submit">
        Kommentar hinzufuegen
      </button>
    </form>
  );
}
