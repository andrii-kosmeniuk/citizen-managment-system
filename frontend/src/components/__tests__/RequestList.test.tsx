import { fireEvent, render, screen } from "@testing-library/react";

import { RequestList } from "../RequestList";

const requests = [
  {
    id: 10,
    title: "Broken lamp",
    description: "desc",
    category_id: 1,
    priority: "HIGH" as const,
    status: "NEW" as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

test("renders rows and selects request", () => {
  const onSelect = vi.fn();
  render(<RequestList requests={requests} selectedRequestId={null} onSelect={onSelect} />);

  fireEvent.click(screen.getByTestId("request-row-10"));
  expect(onSelect).toHaveBeenCalledWith(10);
});
