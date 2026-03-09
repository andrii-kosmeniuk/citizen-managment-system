import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusChanger } from "../StatusChanger";

test("submits status change form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<StatusChanger onSubmit={onSubmit} />);

  await user.clear(screen.getByTestId("status-actor-id"));
  await user.type(screen.getByTestId("status-actor-id"), "7");
  await user.selectOptions(screen.getByTestId("status-next"), "RESOLVED");
  await user.type(screen.getByTestId("status-note"), "done");
  await user.click(screen.getByTestId("status-submit"));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith("RESOLVED", 7, "done");
  });
});
