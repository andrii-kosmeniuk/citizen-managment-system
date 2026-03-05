import { useEffect, useState } from "react";

import { fetchRequests } from "../api/client";
import { RequestList } from "../components/RequestList";
import type { CitizenRequest } from "../types/request";

export function RequestsPage() {
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests()
      .then((data) => setRequests(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Citizen Requests</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && <RequestList requests={requests} />}
    </main>
  );
}
