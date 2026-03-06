import { useEffect, useState, type FormEvent } from "react";

import { createCategory, createRequest, fetchCategories, fetchRequests } from "../api/client";
import { RequestFilters } from "../components/RequestFilters";
import { RequestList } from "../components/RequestList";
import { RequestDetailPage } from "./RequestDetailPage";
import type { Category } from "../types/category";
import type { ActorRole, CitizenRequest, CreateRequestPayload, RequestPriority, RequestStatus } from "../types/request";

interface Filters {
  status?: RequestStatus;
  category_id?: number;
  priority?: RequestPriority;
}

export function RequestsPage() {
  const [actorRole, setActorRole] = useState<ActorRole>(() => {
    const saved = localStorage.getItem("actor_role");
    return saved === "worker" ? "worker" : "citizen";
  });
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [createForm, setCreateForm] = useState<CreateRequestPayload>({
    creator_user_id: 1,
    title: "",
    description: "",
    category_id: 0,
    priority: "MEDIUM",
    citizen_first_name: "",
    citizen_last_name: "",
  });

  const isWorker = actorRole === "worker";

  const loadCategories = async () => {
    const list = await fetchCategories(actorRole, true);
    setCategories(list);
    if (!createForm.category_id && list.length > 0) {
      setCreateForm((prev) => ({ ...prev, category_id: list[0].id }));
    }
  };

  const loadRequests = async (nextFilters: Filters = filters, role: ActorRole = actorRole) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests(role, nextFilters);
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
    localStorage.setItem("actor_role", actorRole);
  }, [actorRole]);

  useEffect(() => {
    (async () => {
      try {
        await loadCategories();
        await loadRequests({}, actorRole);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    })();
  }, [actorRole]);

  const handleCreateRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await createRequest(actorRole, {
        ...createForm,
        citizen_first_name: createForm.citizen_first_name.trim(),
        citizen_last_name: createForm.citizen_last_name.trim(),
      });
      await loadRequests(filters);
      setSelectedRequestId(created.id);
      setCreateForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        citizen_first_name: "",
        citizen_last_name: "",
      }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createCategory(actorRole, newCategoryName, newCategoryDescription.trim());
      await loadCategories();
      setNewCategoryName("");
      setNewCategoryDescription("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", fontFamily: "sans-serif", padding: "0 12px" }}>
      <h1>Citizen Requests Dashboard</h1>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="role-select">
          Role:
          <select
            id="role-select"
            data-testid="role-select"
            value={actorRole}
            onChange={(e) => setActorRole(e.target.value as ActorRole)}
            style={{ marginLeft: 8 }}
          >
            <option value="citizen">Citizen</option>
            <option value="worker">Worker</option>
          </select>
        </label>
      </div>

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
            data-testid="create-citizen-first-name"
            value={createForm.citizen_first_name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, citizen_first_name: e.target.value }))}
            placeholder="Citizen First Name"
          />
          <input
            data-testid="create-citizen-last-name"
            value={createForm.citizen_last_name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, citizen_last_name: e.target.value }))}
            placeholder="Citizen Last Name"
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

      {isWorker && (
        <form
          data-testid="worker-category-form"
          onSubmit={handleCreateCategory}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}
        >
          <h2>Worker: Add Category</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              data-testid="worker-category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name (e.g. Food)"
            />
            <input
              data-testid="worker-category-description"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              placeholder="Category description (optional)"
            />
            <button data-testid="worker-category-submit" type="submit" disabled={!newCategoryName.trim()}>
              Add Category
            </button>
          </div>
        </form>
      )}

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
          <RequestDetailPage
            actorRole={actorRole}
            requestId={selectedRequestId}
            onDataChanged={async () => loadRequests(filters)}
          />
        </section>
      </div>
    </main>
  );
}
