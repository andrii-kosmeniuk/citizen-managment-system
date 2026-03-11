import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CommentBox } from "../CommentBox";

test("submits comment form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<CommentBox role="worker" onSubmit={onSubmit} actorStaffProfileId={5} actorDisplayName="Alex Don" />);

  expect(screen.getByTestId("comment-actor-display")).toHaveTextContent("Kommentar als: Alex Don");
  await user.type(screen.getByTestId("comment-text"), "hello");
  await user.click(screen.getByTestId("comment-submit"));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(5, "hello");
  });
});

test("citizen comment form has no author id input", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<CommentBox role="citizen" onSubmit={onSubmit} />);

  expect(screen.queryByTestId("comment-actor-display")).not.toBeInTheDocument();
  await user.type(screen.getByTestId("comment-text"), "hello");
  await user.click(screen.getByTestId("comment-submit"));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(undefined, "hello");
  });
});

test("worker comment submit stays disabled without selected worker", () => {
  render(<CommentBox role="worker" onSubmit={vi.fn()} actorStaffProfileId={null} />);

  expect(screen.getByTestId("comment-submit")).toBeDisabled();
});
