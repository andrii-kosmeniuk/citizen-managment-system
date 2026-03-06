import { useState } from "react";

interface Props {
  onSubmit: (authorUserId: number, commentText: string) => Promise<void>;
  disabled?: boolean;
}

export function CommentBox({ onSubmit, disabled }: Props) {
  const [authorUserId, setAuthorUserId] = useState(1);
  const [commentText, setCommentText] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(authorUserId, commentText);
        setCommentText("");
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
    >
      <input
        data-testid="comment-author-id"
        type="number"
        min={1}
        value={authorUserId}
        onChange={(e) => setAuthorUserId(Number(e.target.value))}
        placeholder="Author User ID"
      />
      <input
        data-testid="comment-text"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add comment"
      />
      <button data-testid="comment-submit" disabled={disabled} type="submit">
        Add Comment
      </button>
    </form>
  );
}
