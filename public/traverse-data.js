// Traverse — API client (replaces the old static DEMO_DATA)

async function jsonFetch(url, init) {
  const r = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).error || ""; } catch {}
    throw new Error(`${r.status}: ${detail || r.statusText}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

const TraverseAPI = {
  me: () => jsonFetch("/api/me"),

  listTrips: () => jsonFetch("/api/trips"),
  getTrip: (id) => jsonFetch(`/api/trips/${id}`),
  createTrip: (data) => jsonFetch("/api/trips", { method: "POST", body: JSON.stringify(data) }),
  patchTrip: (id, data) => jsonFetch(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTrip: (id) => jsonFetch(`/api/trips/${id}`, { method: "DELETE" }),

  toggleTripGear: (tripId, tripGearId, packed) =>
    jsonFetch(`/api/trips/${tripId}/gear/${tripGearId}`, { method: "PATCH", body: JSON.stringify({ packed }) }),
  addTripGear: (tripId, gearItemId) =>
    jsonFetch(`/api/trips/${tripId}/gear`, { method: "POST", body: JSON.stringify({ gearItemId }) }),
  removeTripGear: (tripId, tripGearId) =>
    jsonFetch(`/api/trips/${tripId}/gear/${tripGearId}`, { method: "DELETE" }),

  patchSegment: (tripId, segId, data) =>
    jsonFetch(`/api/trips/${tripId}/segments/${segId}`, { method: "PATCH", body: JSON.stringify(data) }),

  enableTracking: (tripId) => jsonFetch(`/api/trips/${tripId}/tracking/enable`, { method: "POST" }),
  disableTracking: (tripId) => jsonFetch(`/api/trips/${tripId}/tracking/disable`, { method: "POST" }),
  postLocation: (tripId, lat, lng, accuracy) =>
    jsonFetch(`/api/trips/${tripId}/location`, { method: "POST", body: JSON.stringify({ lat, lng, accuracy }) }),

  listGear: () => jsonFetch("/api/gear"),
  addGear: (g) => jsonFetch("/api/gear", { method: "POST", body: JSON.stringify(g) }),
  patchGear: (id, g) => jsonFetch(`/api/gear/${id}`, { method: "PATCH", body: JSON.stringify(g) }),
  deleteGear: (id) => jsonFetch(`/api/gear/${id}`, { method: "DELETE" }),
  lookupGear: async (input) => {
    const r = await fetch("/api/gear/lookup", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || `${r.status}`);
    }
    return r.json();
  },

  listTemplates: () => jsonFetch("/api/gear/templates"),

  weather: (lat, lng, startDate, days) => {
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), days: String(days) });
    if (startDate) qs.set("start", startDate);
    return jsonFetch(`/api/weather?${qs}`).catch(() => []);
  },

  uploadGpx: async (tripId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    if (tripId) fd.append("tripId", tripId);
    const r = await fetch("/api/import/gpx", { method: "POST", credentials: "same-origin", body: fd });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  },
};

window.TraverseAPI = TraverseAPI;
