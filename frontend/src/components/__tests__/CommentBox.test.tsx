import { fireEvent, render, screen } from "@testing-library/react";

import { CommentBox } from "../CommentBox";

test("submits comment form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CommentBox onSubmit={onSubmit} />);

  fireEvent.change(screen.getByTestId("comment-author-id"), { target: { value: "5" } });
  fireEvent.change(screen.getByTestId("comment-text"), { target: { value: "hello" } });
  fireEvent.click(screen.getByTestId("comment-submit"));

  expect(onSubmit).toHaveBeenCalledWith(5, "hello");
});
