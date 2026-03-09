import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CommentBox } from "../CommentBox";

test("submits comment form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<CommentBox role="worker" onSubmit={onSubmit} />);

  await user.clear(screen.getByTestId("comment-author-id"));
  await user.type(screen.getByTestId("comment-author-id"), "5");
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

  expect(screen.queryByTestId("comment-author-id")).not.toBeInTheDocument();
  await user.type(screen.getByTestId("comment-text"), "hello");
  await user.click(screen.getByTestId("comment-submit"));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith(undefined, "hello");
  });
});
