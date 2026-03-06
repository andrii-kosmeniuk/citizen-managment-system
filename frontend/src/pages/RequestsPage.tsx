import { useEffect, useState, type FormEvent } from "react";

import { createRequest, fetchCategories, fetchRequests } from "../api/client";
import { RequestFilters } from "../components/RequestFilters";
import { RequestList } from "../components/RequestList";
import { RequestDetailPage } from "./RequestDetailPage";
import type { Category } from "../types/category";
import type { CitizenRequest, CreateRequestPayload, RequestPriority, RequestStatus } from "../types/request";

interface Filters {
  status?: RequestStatus;
  category_id?: number;
  priority?: RequestPriority;
}

export function RequestsPage() {
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateRequestPayload>({
    creator_user_id: 1,
    title: "",
    description: "",
    category_id: 0,
    priority: "MEDIUM",
    citizen_name: "",
  });

  const loadCategories = async () => {
    const list = await fetchCategories(true);
    setCategories(list);
    if (!createForm.category_id && list.length > 0) {
      setCreateForm((prev) => ({ ...prev, category_id: list[0].id }));
    }
  };

  const loadRequests = async (nextFilters: Filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests(nextFilters);
      setRequests(data);
      if (data.length > 0 && selectedRequestId === null) {
        setSelectedRequestId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedRequestId(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadCategories();
        await loadRequests({});
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await createRequest({
        ...createForm,
        citizen_name: createForm.citizen_name?.trim() || undefined,
      });
      await loadRequests(filters);
      setSelectedRequestId(created.id);
      setCreateForm((prev) => ({ ...prev, title: "", description: "", citizen_name: "" }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", fontFamily: "sans-serif", padding: "0 12px" }}>
      <h1>Citizen Requests Dashboard</h1>

      <form onSubmit={handleCreateRequest} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h2>Create Request</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <input
            data-testid="create-creator-user-id"
            type="number"
            min={1}
            value={createForm.creator_user_id}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, creator_user_id: Number(e.target.value) }))}
            placeholder="Creator User ID"
          />
          <input
            data-testid="create-title"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
          />
          <input
            data-testid="create-citizen-name"
            value={createForm.citizen_name ?? ""}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, citizen_name: e.target.value }))}
            placeholder="Citizen Name (optional)"
          />
          <textarea
            data-testid="create-description"
            value={createForm.description}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
          />
          <select
            data-testid="create-category"
            value={createForm.category_id}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            data-testid="create-priority"
            value={createForm.priority}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, priority: e.target.value as RequestPriority }))}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <button data-testid="create-submit" style={{ marginTop: 10 }} type="submit" disabled={categories.length === 0}>
          Create
        </button>
      </form>

      <RequestFilters
        categories={categories}
        value={filters}
        onChange={setFilters}
        onApply={() => void loadRequests(filters)}
        onReset={() => {
          const empty = {};
          setFilters(empty);
          void loadRequests(empty);
        }}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section>
          <RequestList requests={requests} selectedRequestId={selectedRequestId} onSelect={setSelectedRequestId} />
        </section>
        <section>
          <RequestDetailPage requestId={selectedRequestId} onDataChanged={async () => loadRequests(filters)} />
        </section>
      </div>
    </main>
  );
}
