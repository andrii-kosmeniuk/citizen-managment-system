import { fireEvent, render, screen } from "@testing-library/react";

import { StatusChanger } from "../StatusChanger";

test("submits status change form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<StatusChanger onSubmit={onSubmit} />);

  fireEvent.change(screen.getByTestId("status-actor-id"), { target: { value: "7" } });
  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "RESOLVED" } });
  fireEvent.change(screen.getByTestId("status-note"), { target: { value: "done" } });

  fireEvent.click(screen.getByTestId("status-submit"));

  expect(onSubmit).toHaveBeenCalledWith("RESOLVED", 7, "done");
});
