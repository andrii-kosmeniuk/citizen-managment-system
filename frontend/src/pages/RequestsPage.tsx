import { useEffect, useState, type FormEvent } from "react";

import { createCategory, createRequest, deleteCategory, fetchCategories, fetchRequests, fetchStaffProfiles } from "../api/client";
import { RequestFilters } from "../components/RequestFilters";
import { RequestList } from "../components/RequestList";
import { StaffProfileList } from "../components/StaffProfileList";
import { RequestDetailPage } from "./RequestDetailPage";
import type { Category } from "../types/category";
import type { StaffProfile } from "../types/staff_profile";
import type { ActorRole, CitizenRequest, CreateRequestPayload, RequestPriority, RequestStatus } from "../types/request";

interface Filters {
  status?: RequestStatus;
  category_id?: number;
  priority?: RequestPriority;
}

interface CreateRequestFormState {
  title: string;
  description: string;
  category_id: number;
  priority: RequestPriority;
  citizen_first_name: string;
  citizen_last_name: string;
}

export function RequestsPage() {
  const normalizeOptionalName = (value: string): string | null => {
    const normalized = value.trim();
    return normalized || null;
  };

  const [actorRole, setActorRole] = useState<ActorRole>(() => {
    const saved = localStorage.getItem("actor_role");
    return saved === "worker" ? "worker" : "citizen";
  });
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState(0);

  const [createForm, setCreateForm] = useState<CreateRequestFormState>({
    title: "",
    description: "",
    category_id: 0,
    priority: "MITTEL",
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
    if (list.length > 0) {
      setDeleteCategoryId((prev) => (prev ? prev : list[0].id));
    } else {
      setDeleteCategoryId(0);
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

  const loadStaffProfiles = async (role: ActorRole = actorRole) => {
    if (role !== "worker") {
      setStaffProfiles([]);
      setSelectedWorkerId(null);
      return;
    }
    const profiles = await fetchStaffProfiles(role);
    setStaffProfiles(profiles);
    setSelectedWorkerId((prev) => {
      if (profiles.length === 0) {
        return null;
      }
      if (prev !== null && profiles.some((profile) => profile.id === prev)) {
        return prev;
      }
      const availableProfile = profiles.find((profile) => profile.is_available && profile.is_active);
      return availableProfile?.id ?? profiles[0].id;
    });
  };

  const selectedWorker =
    selectedWorkerId === null ? null : staffProfiles.find((profile) => profile.id === selectedWorkerId) ?? null;

  useEffect(() => {
    localStorage.setItem("actor_role", actorRole);
  }, [actorRole]);

  useEffect(() => {
    (async () => {
      try {
        await loadCategories();
        await loadRequests({}, actorRole);
        await loadStaffProfiles(actorRole);
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
      const payload: CreateRequestPayload = {
        ...createForm,
        citizen_first_name: normalizeOptionalName(createForm.citizen_first_name),
        citizen_last_name: normalizeOptionalName(createForm.citizen_last_name),
      };
      const created = await createRequest(actorRole, payload);
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

  const handleDeleteCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!deleteCategoryId) {
      return;
    }
    setError(null);
    try {
      await deleteCategory(actorRole, deleteCategoryId);
      await loadCategories();
      await loadRequests(filters);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", fontFamily: "sans-serif", padding: "0 12px" }}>
      <h1>Buergeranliegen-System</h1>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="role-select">
          Rolle:
          <select
            id="role-select"
            data-testid="role-select"
            value={actorRole}
            onChange={(e) => setActorRole(e.target.value as ActorRole)}
            style={{ marginLeft: 8 }}
          >
            <option value="citizen">Buerger:in</option>
            <option value="worker">Mitarbeiter:in</option>
          </select>
        </label>
        {isWorker && (
          <label htmlFor="worker-select" style={{ marginLeft: 16 }}>
            Aktiver Mitarbeiter:
            <select
              id="worker-select"
              data-testid="worker-select"
              value={selectedWorkerId ?? ""}
              onChange={(e) => setSelectedWorkerId(e.target.value ? Number(e.target.value) : null)}
              style={{ marginLeft: 8 }}
            >
              {staffProfiles.length === 0 ? (
                <option value="">Keine Mitarbeiterprofile verfuegbar</option>
              ) : (
                staffProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.first_name} {profile.last_name} ({profile.employee_code})
                  </option>
                ))
              )}
            </select>
          </label>
        )}
      </div>

      {!isWorker ? (
        <form onSubmit={handleCreateRequest} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <h2>Anliegen erstellen</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <input
              data-testid="create-title"
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Titel"
            />
            <input
              data-testid="create-citizen-first-name"
              value={createForm.citizen_first_name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, citizen_first_name: e.target.value }))}
              placeholder="Vorname (optional)"
            />
            <input
              data-testid="create-citizen-last-name"
              value={createForm.citizen_last_name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, citizen_last_name: e.target.value }))}
              placeholder="Nachname (optional)"
            />
            <textarea
              data-testid="create-description"
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Beschreibung"
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
              <option value="NIEDRIG">NIEDRIG</option>
              <option value="MITTEL">MITTEL</option>
              <option value="HOCH">HOCH</option>
              <option value="KRITISCH">KRITISCH</option>
            </select>
          </div>
          <button data-testid="create-submit" style={{ marginTop: 10 }} type="submit" disabled={categories.length === 0}>
            Erstellen
          </button>
        </form>
      ) : (
        <section
          data-testid="create-request-disabled"
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}
        >
          <h2>Anliegen erstellen</h2>
          <p>Nur Buerger:innen koennen neue Anliegen erfassen.</p>
        </section>
      )}

      {isWorker && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <form data-testid="worker-category-form" onSubmit={handleCreateCategory}>
            <h2>Mitarbeiter: Kategorie hinzufuegen</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                data-testid="worker-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Kategoriename (z.B. Essen)"
              />
              <input
                data-testid="worker-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Kategoriebeschreibung (optional)"
              />
              <button data-testid="worker-category-submit" type="submit" disabled={!newCategoryName.trim()}>
                Kategorie hinzufuegen
              </button>
            </div>
          </form>

          <form data-testid="worker-category-delete-form" onSubmit={handleDeleteCategory} style={{ marginTop: 12 }}>
            <h2>Mitarbeiter: Kategorie loeschen</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                data-testid="worker-delete-category-select"
                value={deleteCategoryId}
                onChange={(e) => setDeleteCategoryId(Number(e.target.value))}
                disabled={categories.length === 0}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                data-testid="worker-delete-category-submit"
                type="submit"
                disabled={categories.length === 0 || !deleteCategoryId}
              >
                Kategorie loeschen
              </button>
            </div>
          </form>
        </div>
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

      {loading && <p>Laden...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section>
          <h3>Anliegen</h3>
          <RequestList requests={requests} selectedRequestId={selectedRequestId} onSelect={setSelectedRequestId} />
          {isWorker && (
            <div style={{ marginTop: 16 }}>
              <h3>Mitarbeiterprofile</h3>
              <StaffProfileList staffProfiles={staffProfiles} />
            </div>
          )}
        </section>
        <section>
          <RequestDetailPage
            actorRole={actorRole}
            requestId={selectedRequestId}
            selectedWorker={selectedWorker}
            onDataChanged={async () => loadRequests(filters)}
          />
        </section>
      </div>
    </main>
  );
}
