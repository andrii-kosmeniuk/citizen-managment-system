import { fireEvent, render, screen } from "@testing-library/react";

import { RequestFilters } from "../RequestFilters";

test("emits filter changes and apply/reset actions", () => {
  const onChange = vi.fn();
  const onApply = vi.fn();
  const onReset = vi.fn();

  render(
    <RequestFilters
      categories={[{ id: 1, name: "Infra", is_active: true }]}
      value={{}}
      onChange={onChange}
      onApply={onApply}
      onReset={onReset}
    />,
  );

  fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "NEW" } });
  expect(onChange).toHaveBeenCalled();

  fireEvent.click(screen.getByTestId("filter-apply"));
  expect(onApply).toHaveBeenCalled();

  fireEvent.click(screen.getByTestId("filter-reset"));
  expect(onReset).toHaveBeenCalled();
});
