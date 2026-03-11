import { useState } from "react";

interface Props {
  role: "citizen" | "worker";
  onSubmit: (authorStaffProfileId: number | undefined, commentText: string) => Promise<void>;
  disabled?: boolean;
}

export function CommentBox({ role, onSubmit, disabled }: Props) {
  const [authorStaffProfileId, setAuthorStaffProfileId] = useState(1);
  const [commentText, setCommentText] = useState("");
  const isWorker = role === "worker";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(isWorker ? authorStaffProfileId : undefined, commentText);
        setCommentText("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      {isWorker && (
        <input
          data-testid="comment-author-id"
          type="number"
          min={1}
          value={authorStaffProfileId}
          onChange={(e) => setAuthorStaffProfileId(Number(e.target.value))}
          placeholder="Autor Mitarbeiterprofil-ID"
        />
      )}
      <input
        data-testid="comment-text"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Kommentar hinzufuegen"
      />
      <button data-testid="comment-submit" disabled={disabled} type="submit">
        Kommentar hinzufuegen
      </button>
    </form>
  );
}
