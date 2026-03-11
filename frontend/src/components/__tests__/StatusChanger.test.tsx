import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StatusChanger } from "../StatusChanger";

test("submits status change form", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<StatusChanger onSubmit={onSubmit} actorStaffProfileId={7} actorDisplayName="Alex Don" />);

  expect(screen.getByTestId("status-actor-display")).toHaveTextContent("Bearbeiter: Alex Don");
  await user.selectOptions(screen.getByTestId("status-next"), "RESOLVED");
  await user.type(screen.getByTestId("status-note"), "done");
  await user.click(screen.getByTestId("status-submit"));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith("RESOLVED", 7, "done");
  });
});

test("disables submit when no worker is selected", () => {
  render(<StatusChanger onSubmit={vi.fn()} actorStaffProfileId={null} actorDisplayName={null} />);

  expect(screen.getByTestId("status-submit")).toBeDisabled();
});
