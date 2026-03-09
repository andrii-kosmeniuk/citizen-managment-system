import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RequestsPage } from "../RequestsPage";
import type { RequestCommentItem } from "../../types/request";

vi.mock("../../api/client", () => {
  let currentStatus = "NEW";
  let comments: RequestCommentItem[] = [
    {
      id: 1,
      request_id: 1,
      author_user_id: 1,
      author_role: "WORKER",
      author_display_name: "Worker One",
      comment_text: "Initial",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  return {
    fetchCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Infrastructure", is_active: true }]),
    fetchStaffUsers: vi.fn().mockResolvedValue([
      {
        id: 1,
        first_name: "Alex",
        last_name: "Don",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]),
    fetchRequests: vi.fn().mockImplementation(async () => [
      {
        id: 1,
        title: "Broken lamp",
        description: "desc",
        category_id: 1,
        priority: "HIGH",
        status: currentStatus,
        citizen_first_name: "Jane",
        citizen_last_name: "Citizen",
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
        citizen_first_name: "Jane",
        citizen_last_name: "Citizen",
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
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    claimRequest: vi.fn().mockResolvedValue({}),
    updateRequestStatus: vi.fn().mockImplementation(
      async (_role: string, _id: number, _actor: number, to: string) => {
        currentStatus = to;
        return {};
      },
    ),
    addRequestComment: vi.fn().mockImplementation(async () => {
      if (currentStatus === "CLOSED") {
        throw new Error("Closed request cannot be modified");
      }
      comments = [
        ...comments,
        {
          id: comments.length + 1,
          request_id: 1,
          author_user_id: null,
          author_role: "CITIZEN",
          author_display_name: "Jane Citizen",
          comment_text: "new comment",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
    }),
    createCategory: vi.fn().mockResolvedValue({ id: 5, name: "Other", is_active: true }),
  };
});

beforeEach(() => {
  localStorage.clear();
});

test("basic dashboard user flow works", async () => {
  render(<RequestsPage />);

  await waitFor(() => expect(screen.getByText("Buergeranliegen-System")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByTestId("request-row-1")).toBeInTheDocument());

  fireEvent.change(screen.getByTestId("create-title"), { target: { value: "Pothole" } });
  fireEvent.change(screen.getByTestId("create-description"), { target: { value: "Large pothole" } });
  fireEvent.change(screen.getByTestId("create-citizen-first-name"), { target: { value: "Max" } });
  fireEvent.change(screen.getByTestId("create-citizen-last-name"), { target: { value: "Muster" } });
  fireEvent.click(screen.getByTestId("create-submit"));

  fireEvent.change(screen.getByTestId("role-select"), { target: { value: "worker" } });
  await waitFor(() => expect(screen.getByTestId("claim-submit")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByTestId("staff-list-table")).toBeInTheDocument());
  expect(screen.getByTestId("worker-category-delete-form")).toBeInTheDocument();
  fireEvent.click(screen.getByTestId("claim-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "IN_PROGRESS" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "RESOLVED" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  fireEvent.change(screen.getByTestId("status-next"), { target: { value: "CLOSED" } });
  fireEvent.click(screen.getByTestId("status-submit"));

  await waitFor(() => expect(screen.getByTestId("request-detail")).toHaveTextContent("Status: Geschlossen"));

  expect(screen.getByTestId("claim-submit")).toBeDisabled();
  expect(screen.getByTestId("status-submit")).toBeDisabled();
  expect(screen.getByTestId("comment-submit")).toBeDisabled();
});

test("citizen role hides worker-only controls", async () => {
  render(<RequestsPage />);

  await waitFor(() => expect(screen.getByTestId("request-row-1")).toBeInTheDocument());
  expect(screen.getByTestId("role-select")).toHaveValue("citizen");
  expect(screen.queryByTestId("worker-category-form")).not.toBeInTheDocument();
  expect(screen.queryByTestId("worker-category-delete-form")).not.toBeInTheDocument();
  expect(screen.queryByTestId("staff-list-table")).not.toBeInTheDocument();
  expect(screen.queryByTestId("claim-submit")).not.toBeInTheDocument();
  expect(screen.queryByTestId("status-submit")).not.toBeInTheDocument();
  expect(screen.getByTestId("comment-submit")).toBeInTheDocument();
});

test("worker role cannot see create request form", async () => {
  render(<RequestsPage />);
  await waitFor(() => expect(screen.getByTestId("request-row-1")).toBeInTheDocument());

  fireEvent.change(screen.getByTestId("role-select"), { target: { value: "worker" } });

  await waitFor(() => expect(screen.getByTestId("create-request-disabled")).toBeInTheDocument());
  expect(screen.queryByTestId("create-submit")).not.toBeInTheDocument();
});
