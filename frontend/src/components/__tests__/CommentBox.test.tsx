import { fireEvent, render, screen } from "@testing-library/react";

import { CommentBox } from "../CommentBox";

test("submits comment form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CommentBox role="worker" onSubmit={onSubmit} />);

  fireEvent.change(screen.getByTestId("comment-author-id"), { target: { value: "5" } });
  fireEvent.change(screen.getByTestId("comment-text"), { target: { value: "hello" } });
  fireEvent.click(screen.getByTestId("comment-submit"));

  expect(onSubmit).toHaveBeenCalledWith(5, "hello");
});

test("citizen comment form has no author id input", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CommentBox role="citizen" onSubmit={onSubmit} />);

  expect(screen.queryByTestId("comment-author-id")).not.toBeInTheDocument();
  fireEvent.change(screen.getByTestId("comment-text"), { target: { value: "hello" } });
  fireEvent.click(screen.getByTestId("comment-submit"));

  expect(onSubmit).toHaveBeenCalledWith(undefined, "hello");
});
