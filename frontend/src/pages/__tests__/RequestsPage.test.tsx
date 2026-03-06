import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RequestsPage } from "../RequestsPage";

vi.mock("../../api/client", () => {
  let currentStatus = "NEW";
  let comments = [
    {
      id: 1,
      request_id: 1,
      author_user_id: 1,
      comment_text: "Initial",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  return {
    fetchCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Infrastructure", is_active: true }]),
    fetchRequests: vi.fn().mockImplementation(async () => [
      {
        id: 1,
        title: "Broken lamp",
        description: "desc",
        category_id: 1,
        priority: "HIGH",
        status: currentStatus,
        assigned_to_user_id: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]),
    fetchRequestDetail: vi.fn().mockImplementation(async () => ({
      request: {
        id: 1,
        title: "Broken lamp",
        description: "desc",
        category_id: 1,
        priority: "HIGH",
        status: currentStatus,
        assigned_to_user_id: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      comments,
      status_history: [
        {
          id: 1,
          request_id: 1,
          from_status: null,
          to_status: "NEW",
          changed_by_user_id: 1,
          change_note: "Initial",
          changed_at: "2026-01-01T00:00:00Z",
        },
      ],
    })),
    createRequest: vi.fn().mockResolvedValue({ id: 1 }),
    claimRequest: vi.fn().mockResolvedValue({}),
    updateRequestStatus: vi.fn().mockImplementation(async (_id: number, _actor: number, to: string) => {
      currentStatus = to;
      return {};
    }),
    addRequestComment: vi.fn().mockImplementation(async () => {
      if (currentStatus === "CLOSED") {
        throw new Error("Closed request cannot be modified");
      }
      comments = [
        ...comments,
        {
          id: comments.length + 1,
          request_id: 1,
          author_user_id: 1,
          comment_text: "new comment",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
    }),
  };
});

test("basic dashboard user flow works", async () => {
  render(<RequestsPage />);

  await waitFor(() => expect(screen.getByText("Citizen Requests Dashboard")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByTestId("request-row-1")).toBeInTheDocument());

  fireEvent.change(screen.getByTestId("create-title"), { target: { value: "Pothole" } });
  fireEvent.change(screen.getByTestId("create-description"), { target: { value: "Large pothole" } });
  fireEvent.click(screen.getByTestId("create-submit"));

  fireEvent.click(screen.getByTestId("claim-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "IN_PROGRESS" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "RESOLVED" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "CLOSED" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  await waitFor(() => expect(screen.getByTestId("request-detail")).toHaveTextContent("Status: CLOSED"));

  expect(screen.getByTestId("claim-submit")).toBeDisabled();
  expect(screen.getByTestId("status-submit")).toBeDisabled();
  expect(screen.getByTestId("comment-submit")).toBeDisabled();
});
