// Traverse — Screens v2 (visual refresh + gear lookup + replanning)

const { useState, useRef } = React;
const { TopoPattern, Avatar, Badge, SectionLabel, Card, Toggle, WeatherIcon } = window;

// ─── Add Gear Panel (Claude URL lookup) ──────────────────────────────
const AddGearPanel = ({ onClose, onAdd }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("Ride");

  const lookup = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const parsed = await TraverseAPI.lookupGear(input);
      setResult(parsed);
      setCategory(parsed.category || "Ride");
    } catch (e) {
      setError(e.message && /configured/i.test(e.message)
        ? "AI lookup not configured. Type details manually below, or set ANTHROPIC_API_KEY on the server."
        : "Could not parse product details. Try a more specific URL or product name.");
    }
    setLoading(false);
  };

  const confirm = async () => {
    if (!result) return;
    try {
      await onAdd({ ...result, category });
      onClose();
    } catch (e) {
      setError(e.message || "Could not save gear.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: "#F4F1EA" }}>
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight font-serif" style={{ color: "#1F1F1E" }}>Add gear</h2>
              <p className="text-xs font-mono mt-0.5" style={{ color: "#7A8471" }}>Paste a product URL or describe the item</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: "#E8E2D4", color: "#7A8471" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookup()}
              placeholder="https://www.seatolsummit.com/... or 'Apidura Racing Saddle Pack 11L'"
              className="flex-1 px-4 py-3 rounded-xl text-sm font-mono outline-none"
              style={{ backgroundColor: "#E8E2D4", color: "#1F1F1E" }} />
            <button onClick={lookup} disabled={loading || !input.trim()}
              className="px-4 py-3 rounded-xl text-sm font-medium flex-shrink-0 transition-opacity"
              style={{ backgroundColor: "#2D3E2F", color: "#F4F1EA", opacity: loading || !input.trim() ? 0.5 : 1 }}>
              {loading ? "Looking…" : "Look up"}
            </button>
          </div>

          {error && <p className="text-xs font-mono mb-4" style={{ color: "var(--accent, #A64B2A)" }}>{error}</p>}

          {result && (
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ backgroundColor: "#E8E2D4" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold font-serif text-base tracking-tight" style={{ color: "#1F1F1E" }}>{result.name}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "#7A8471" }}>{result.brand}</p>
                </div>
                <p className="font-mono text-lg font-semibold" style={{ color: "var(--accent, #A64B2A)" }}>{result.weight_g}g</p>
              </div>
              {result.description && <p className="text-xs leading-relaxed" style={{ color: "#7A8471" }}>{result.description}</p>}
              <div>
                <p className="text-xs font-mono mb-1.5" style={{ color: "#7A8471" }}>Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Sleep","Cook","Wear","Ride","Safety","Documents"].map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ backgroundColor: category === c ? "#2D3E2F" : "#F4F1EA", color: category === c ? "#F4F1EA" : "#7A8471" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm" style={{ backgroundColor: "#E8E2D4", color: "#7A8471" }}>Cancel</button>
            {result && (
              <button onClick={confirm} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "#2D3E2F", color: "#F4F1EA" }}>
                Add to library
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Route Replanning Section ─────────────────────────────────────────
const ReplanSection = ({ segments, onSaveActual }) => {
  const [active, setActive] = useState(() => (segments || []).some(s => s.actualKm != null));
  const initial = {};
  (segments || []).forEach(s => { if (s.actualKm != null) initial[s.day] = s.actualKm; });
  const [actuals, setActuals] = useState(initial);
  const totalPlanned = segments.reduce((s, seg) => s + seg.distance, 0);

  const setActual = (day, km) => {
    setActuals(a => ({ ...a, [day]: km }));
  };
  const persistActual = (segId, km) => {
    if (onSaveActual) onSaveActual(segId, km);
  };

  const completedDays = Object.keys(actuals).map(Number).sort();
  const lastCompletedDay = Math.max(...completedDays, 0);
  const coveredActual = completedDays.reduce((s, d) => s + (actuals[d] || 0), 0);
  const coveredPlanned = segments.filter(s => s.day <= lastCompletedDay).reduce((s, seg) => s + seg.distance, 0);
  const delta = coveredActual - coveredPlanned;
  const remainingSegments = segments.filter(s => s.day > lastCompletedDay);
  const remainingPlanned = remainingSegments.reduce((s, seg) => s + seg.distance, 0);
  const remainingActual = totalPlanned - coveredActual;
  const dayCount = remainingSegments.length;

  // Redistribute remaining km evenly across remaining days
  const adjustedPerDay = dayCount > 0 ? Math.round(remainingActual / dayCount) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#E8E2D4" }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold font-serif tracking-tight" style={{ color: "#1F1F1E" }}>Live route adjustment</p>
          <Toggle on={active} onToggle={() => setActive(v => !v)} label="" />
        </div>
        <p className="text-xs font-mono" style={{ color: "#7A8471" }}>Track actual progress and replan remaining days</p>
      </div>

      {active && (
        <div style={{ borderTop: "1px solid #D4CEC3" }}>
          {/* Day inputs */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7A8471" }}>Actual distance covered</p>
            {segments.map(seg => (
              <div key={seg.day} className="flex items-center gap-3">
                <p className="text-xs font-mono w-10 flex-shrink-0" style={{ color: "#7A8471" }}>Day {seg.day}</p>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#D4CEC3" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(((actuals[seg.day] || 0) / seg.distance) * 100, 100)}%`, backgroundColor: "#2D3E2F" }} />
                    </div>
                    <span className="font-mono text-xs w-12 text-right" style={{ color: "#1F1F1E" }}>
                      {actuals[seg.day] != null ? `${actuals[seg.day]}km` : "—"}
                    </span>
                  </div>
                  <input type="range" min={0} max={Math.round(seg.distance * 1.5)} step={1}
                    value={actuals[seg.day] || 0}
                    onChange={e => setActual(seg.day, Number(e.target.value))}
                    onMouseUp={e => persistActual(seg.id, Number(e.target.value))}
                    onTouchEnd={e => persistActual(seg.id, Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: "#2D3E2F" }} />
                </div>
                <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: "#7A8471" }}>/{seg.distance}km</span>
              </div>
            ))}
          </div>

          {/* Replan output */}
          {lastCompletedDay > 0 && (
            <div className="p-4 space-y-3" style={{ borderTop: "1px solid #D4CEC3" }}>
              {/* Delta summary */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7A8471" }}>Status</p>
                <span className="font-mono text-sm font-semibold"
                  style={{ color: delta >= 0 ? "#2D3E2F" : "#A64B2A" }}>
                  {delta >= 0 ? `+${delta}km ahead` : `${delta}km behind`}
                </span>
              </div>

              {/* Remaining adjustments */}
              {dayCount > 0 && (
                <div className="rounded-xl p-3" style={{ backgroundColor: "#F4F1EA" }}>
                  <p className="text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Suggested replan — {remainingActual}km over {dayCount} day{dayCount !== 1 ? "s" : ""}</p>
                  {remainingSegments.map((seg, i) => (
                    <div key={seg.day} className="flex items-center gap-3 py-1.5" style={{ borderTop: i > 0 ? "1px solid #E8E2D4" : "none" }}>
                      <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: "#7A8471" }}>Day {seg.day}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-1 rounded-full flex-1" style={{ backgroundColor: "#E8E2D4" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min((adjustedPerDay / (seg.distance * 1.3)) * 100, 100)}%`, backgroundColor: "#A64B2A" }} />
                        </div>
                      </div>
                      <span className="font-mono text-xs flex-shrink-0" style={{ color: "#1F1F1E" }}>
                        {adjustedPerDay}km <span style={{ color: "#7A8471" }}>vs {seg.distance}km</span>
                      </span>
                    </div>
                  ))}
                  <p className="text-xs font-mono mt-2" style={{ color: "#7A8471" }}>
                    {Math.abs(delta) > 5
                      ? delta > 0
                        ? `You're well ahead. Consider an extended rest or a short side route.`
                        : `Shorter days ahead — check accommodation options for adjusted stops.`
                      : "On track. No major adjustments needed."}
                  </p>
                </div>
              )}

              {dayCount === 0 && (
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "#F4F1EA" }}>
                  <p className="text-sm font-serif font-semibold tracking-tight" style={{ color: "#2D3E2F" }}>Route complete</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "#7A8471" }}>{coveredActual}km ridden · {coveredActual - totalPlanned >= 0 ? "+" : ""}{coveredActual - totalPlanned}km vs plan</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Meal Card ────────────────────────────────────────────────────────
const MealCard = ({ meal }) => {
  const [open, setOpen] = useState(false);
  const meals = [
    { label: "Breakfast", data: meal.breakfast },
    { label: "Lunch",     data: meal.lunch },
    { label: "Dinner",    data: meal.dinner },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#E8E2D4" }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-xs font-semibold"
            style={{ backgroundColor: "#2D3E2F", color: "#F4F1EA" }}>
            {meal.day}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#1F1F1E" }}>{meal.dinner.name}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: "#7A8471" }}>Day {meal.day} · {meal.foodWeight > 0 ? `${meal.foodWeight}g` : "—"} food</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 ml-2 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}>
          <path d="M6 3l5 5-5 5" stroke="#7A8471" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid #D4CEC3" }}>
          {meals.map(({ label, data }) => (
            <div key={label} className="px-4 py-3.5 flex items-start gap-4" style={{ borderBottom: "1px solid #D4CEC3" }}>
              <p className="text-xs font-mono w-20 flex-shrink-0 pt-0.5" style={{ color: "#7A8471" }}>{label}</p>
              <div className="flex-1">
                <p className="text-sm" style={{ color: "#1F1F1E" }}>{data.name}</p>
                {data.notes && <p className="text-xs font-mono mt-0.5 leading-relaxed" style={{ color: "#7A8471" }}>{data.notes}</p>}
              </div>
              {data.weight > 0 && <p className="font-mono text-xs flex-shrink-0" style={{ color: "#7A8471" }}>{data.weight}g</p>}
            </div>
          ))}
          {meal.snacks && (
            <div className="px-4 py-3.5 flex items-start gap-4">
              <p className="text-xs font-mono w-20 flex-shrink-0" style={{ color: "#7A8471" }}>Snacks</p>
              <p className="text-sm flex-1" style={{ color: "#1F1F1E" }}>{meal.snacks}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── TRIPS DASHBOARD ──────────────────────────────────────────────────
const TripsDashboard = ({ trips, onOpenTrip, onNewTrip }) => {
  const upcoming = trips.find(t => t.status === "upcoming");
  const rest = trips.filter(t => t.id !== upcoming?.id);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F1EA" }}>

      {/* Athletic page header */}
      <div className="px-6 pt-8 pb-5" style={{ borderBottom: "1px solid #D4CEC3" }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: "#7A8471" }}>April 2026</p>
            <h1 className="font-bold uppercase" style={{ fontSize: "2.6rem", lineHeight: 1, letterSpacing: "-0.03em", color: "#1F1F1E" }}>Trips</h1>
          </div>
          <button onClick={onNewTrip}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold mb-1"
            style={{ backgroundColor: "#0D1A0E", color: "#F4F1EA" }}>
            <span className="text-base leading-none">+</span> New trip
          </button>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-8 pb-28">
        {upcoming && (
          <div>
            {/* Hero trip card — dark athletic */}
            <div className="rounded-2xl overflow-hidden cursor-pointer" style={{ backgroundColor: "#0D1A0E" }}
              onClick={() => onOpenTrip(upcoming)}>

              {/* Big stat block */}
              <div className="relative px-6 pt-6 pb-0 overflow-hidden">
                <TopoPattern opacity={0.07} />
                <div className="relative z-10">
                  {/* Country label — graphic treatment */}
                  <div className="inline-flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent, #A64B2A)" }} />
                    <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "#7A8471" }}>
                      {upcoming.country}
                    </p>
                  </div>
                  {/* Giant stats */}
                  <div className="flex items-end gap-0 mb-1">
                    <div className="flex-1">
                      <p className="font-mono font-bold leading-none" style={{ fontSize: "4.5rem", color: "#F4F1EA", letterSpacing: "-0.04em" }}>
                        {upcoming.distance}
                        <span className="text-2xl font-normal ml-1" style={{ color: "#7A8471" }}>km</span>
                      </p>
                    </div>
                    <div className="text-right pb-2">
                      <p className="font-mono text-base font-semibold" style={{ color: "#7A8471" }}>↑{upcoming.elevation}m</p>
                      <p className="font-mono text-base font-semibold mt-0.5" style={{ color: "#7A8471" }}>{upcoming.segments?.length} days</p>
                    </div>
                  </div>
                  {/* Topo divider */}
                  <div className="h-px w-full" style={{ background: "linear-gradient(to right, #2D3E2F, transparent)" }} />
                </div>
              </div>

              {/* Trip name + meta */}
              <div className="px-6 py-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif font-semibold leading-tight" style={{ fontSize: "1.4rem", color: "#F4F1EA", letterSpacing: "-0.02em" }}>
                      {upcoming.name}
                    </h2>
                    <p className="font-mono text-xs mt-1.5" style={{ color: "#7A8471" }}>
                      {new Date(upcoming.dates.start).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} – {new Date(upcoming.dates.end).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}
                    </p>
                  </div>
                  {/* Days countdown */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold leading-none" style={{ fontSize: "2.8rem", color: "var(--accent, #A64B2A)", letterSpacing: "-0.04em" }}>
                      {upcoming.daysUntil}
                    </p>
                    <p className="font-mono text-xs" style={{ color: "#7A8471" }}>days out</p>
                  </div>
                </div>

                {/* Participants + type */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {upcoming.participants.map(p => <Avatar key={p.name} initials={p.initials} confirmed={p.confirmed} />)}
                    <span className="font-mono text-xs" style={{ color: "#7A8471" }}>
                      {upcoming.participants.filter(p=>p.confirmed).length} confirmed
                    </span>
                  </div>
                  <span className="font-mono text-xs px-2 py-1 rounded" style={{ backgroundColor: "#1A2E1B", color: "#7A8471", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {upcoming.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Past & drafts */}
        <div>
          <SectionLabel>Past &amp; drafts</SectionLabel>
          <div className="space-y-2">
            {rest.map(trip => (
              <div key={trip.id} onClick={() => onOpenTrip(trip)}
                className="rounded-2xl cursor-pointer overflow-hidden"
                style={{ backgroundColor: "#E8E2D4" }}>
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug mb-1.5" style={{ color: "#1F1F1E", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>{trip.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge label={trip.status} color={trip.status === "draft" ? "sand" : "sage"} />
                      <p className="text-xs font-mono" style={{ color: "#7A8471" }}>{trip.country}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-xl font-bold" style={{ color: "#1F1F1E", letterSpacing: "-0.03em" }}>{trip.distance}km</p>
                    <p className="font-mono text-xs" style={{ color: "#7A8471" }}>↑{trip.elevation}m</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"><path d="M6 3l5 5-5 5" stroke="#7A8471" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── TRIP DETAIL ──────────────────────────────────────────────────────
const TripDetail = ({ trip, gearLibrary = [], onBack, onTogglePacked, onAddGearToTrip, onUpdateSegment, onToggleTracking }) => {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview","Route","Gear","Logistics","Live"];
  const [importUrl, setImportUrl] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showGearPicker, setShowGearPicker] = useState(false);
  const [gpxStatus, setGpxStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = React.useRef(null);
  const gearCategories = ["Sleep","Cook","Wear","Ride","Safety","Documents"];
  const tripGear = trip.gear || [];
  const checkedItems = tripGear.filter(g => g.packed);
  const totalWeight = checkedItems.reduce((s,g) => s + (g.weight||0), 0);
  const fullWeight = tripGear.reduce((s,g) => s + (g.weight||0), 0);
  const trackingOn = !!trip.trackingEnabled;

  // Derive lat/lng from the start waypoint for weather
  const startWp = (trip.waypoints||[]).find(w => w.lat != null && w.lng != null) || {};
  React.useEffect(() => {
    if (!trip.dates?.start || startWp.lat == null) return;
    setWeatherLoading(true);
    TraverseAPI.weather(startWp.lat, startWp.lng, trip.dates.start, Math.min((trip.segments?.length||3), 7))
      .then(setWeather).finally(() => setWeatherLoading(false));
  }, [trip.id]);

  const gearByCategory = (cat) => tripGear.filter(g => g.category === cat);
  const gearInTripIds = new Set(tripGear.map(g => g.gearItemId));
  const availableToAdd = gearLibrary.filter(g => !gearInTripIds.has(g.id));

  const onGpxFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setGpxStatus({ kind: "loading" });
    try {
      const res = await TraverseAPI.uploadGpx(trip.id, f);
      setGpxStatus({ kind: "ok", summary: res });
    } catch (err) {
      setGpxStatus({ kind: "error", message: err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#F4F1EA" }}>
      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-6 pb-6" style={{ backgroundColor: "#0D1A0E" }}>
        <TopoPattern opacity={0.07} />
        <button onClick={onBack} className="flex items-center gap-1.5 mb-5 text-xs font-mono relative z-10 uppercase tracking-widest" style={{ color: "#7A8471" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11.5L4 7l5-4.5" stroke="#7A8471" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Trips
        </button>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--accent, #A64B2A)" }} />
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: "#7A8471" }}>{trip.country}</p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif font-semibold leading-tight flex-1" style={{ fontSize: "1.6rem", color: "#F4F1EA", letterSpacing: "-0.02em" }}>{trip.name}</h1>
            <Badge label={trip.type} color="rust" />
          </div>
          <div className="flex gap-6 mt-4">
            {[{v:`${trip.distance}km`,l:"distance"},{v:`${trip.elevation}m`,l:"elevation"},{v:`${trip.segments?.length||"—"} days`,l:"days"}].map(i=>(
              <div key={i.l}>
                <p className="font-mono font-bold" style={{ fontSize: "1.6rem", color: "#F4F1EA", letterSpacing: "-0.04em", lineHeight: 1 }}>{i.v}</p>
                <p className="text-xs font-mono mt-1" style={{ color: "#7A8471" }}>{i.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto flex-shrink-0" style={{ borderColor: "#D4CEC3", backgroundColor: "#F4F1EA" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-3.5 text-xs font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border-b-2 transition-colors"
            style={{ borderColor: tab===t ? "#0D1A0E" : "transparent", color: tab===t ? "#1F1F1E" : "#7A8471", letterSpacing: "0.08em" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-5">

        {/* OVERVIEW */}
        {tab === "Overview" && <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#E8E2D4" }}>
              <SectionLabel>Dates</SectionLabel>
              <p className="font-mono text-sm leading-relaxed" style={{ color: "#1F1F1E" }}>
                {new Date(trip.dates.start).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} –<br/>
                {new Date(trip.dates.end).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#E8E2D4" }}>
              <SectionLabel>Party</SectionLabel>
              <div className="flex gap-1.5 flex-wrap">
                {(trip.participants||[]).map(p => <Avatar key={p.name} initials={p.initials} confirmed={p.confirmed} />)}
              </div>
            </div>
          </div>
          {trip.summary && (
            <div className="rounded-2xl p-5" style={{ backgroundColor: "#E8E2D4" }}>
              <SectionLabel>Summary</SectionLabel>
              <p className="text-sm leading-relaxed" style={{ color: "#1F1F1E" }}>{trip.summary}</p>
            </div>
          )}
          <div>
            <SectionLabel>Forecast</SectionLabel>
            {weatherLoading && <p className="font-mono text-xs" style={{ color: "#7A8471" }}>Fetching forecast…</p>}
            {!weatherLoading && weather && weather.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                {weather.slice(0,3).map((w,i) => (
                  <div key={i} className="rounded-2xl p-4 text-center" style={{ backgroundColor: "#E8E2D4" }}>
                    <p className="text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Day {i+1}</p>
                    <WeatherIcon icon={w.icon} />
                    <p className="font-mono text-base font-semibold mt-1.5" style={{ color: "#1F1F1E" }}>{w.temp}°</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: "#7A8471" }}>{w.wind}km/h</p>
                    {w.rain > 0 && <p className="font-mono text-xs" style={{ color: "var(--accent, #A64B2A)" }}>{w.rain}% rain</p>}
                  </div>
                ))}
              </div>
            )}
            {!weatherLoading && (!weather || weather.length === 0) && (
              <p className="font-mono text-xs" style={{ color: "#7A8471" }}>
                {startWp.lat == null ? "Add a waypoint with coordinates for forecast." : "Forecast unavailable for these dates."}
              </p>
            )}
          </div>
        </>}

        {/* ROUTE */}
        {tab === "Route" && <>
          <div className="relative rounded-2xl h-52 overflow-hidden" style={{ backgroundColor: "#2D3E2F" }}>
            <TopoPattern opacity={0.15} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "#7A8471" }}>Route map</p>
              <p className="font-mono text-xs" style={{ color: "#7A8471" }}>
                {(trip.waypoints||[]).filter(w=>w.lat!=null).length} waypoints · Mapbox coming soon
              </p>
            </div>
          </div>
          <div>
            <SectionLabel>Import route</SectionLabel>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="Paste Komoot or Strava URL"
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-mono outline-none"
                  style={{ backgroundColor: "#E8E2D4", color: "#1F1F1E" }} />
                <button
                  onClick={() => alert("Komoot / Strava import requires API credentials — coming soon")}
                  className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "#2D3E2F", color: "#F4F1EA" }}>Import</button>
              </div>
              <input ref={fileInputRef} type="file" accept=".gpx,application/gpx+xml" className="hidden" onChange={onGpxFile} />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl text-sm font-mono flex items-center justify-center gap-2"
                style={{ border: "1.5px dashed #D4CEC3", color: "#7A8471" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 6l4-4 4 4M2 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Upload .gpx file
              </button>
              {gpxStatus?.kind === "loading" && <p className="text-xs font-mono" style={{ color: "#7A8471" }}>Parsing GPX…</p>}
              {gpxStatus?.kind === "ok" && (
                <p className="text-xs font-mono" style={{ color: "#2D3E2F" }}>
                  Imported · {gpxStatus.summary.distanceKm}km · ↑{gpxStatus.summary.elevationGainM}m · {gpxStatus.summary.pointCount} points
                </p>
              )}
              {gpxStatus?.kind === "error" && <p className="text-xs font-mono" style={{ color: "#A64B2A" }}>GPX import failed — {gpxStatus.message}</p>}
            </div>
          </div>
          <div>
            <SectionLabel>Daily segments</SectionLabel>
            <div className="space-y-2.5">
              {(trip.segments||[]).map((seg,i) => (
                <div key={seg.id || i} className="rounded-2xl p-5" style={{ backgroundColor: "#E8E2D4" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-mono mb-1" style={{ color: "#7A8471" }}>Day {seg.day}</p>
                      <p className="font-semibold font-serif tracking-tight" style={{ color: "#1F1F1E" }}>{seg.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-semibold" style={{ color: "var(--accent, #A64B2A)" }}>{seg.distance}km</p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: "#7A8471" }}>↑{seg.elevation}m</p>
                    </div>
                  </div>
                  <p className="text-xs font-mono" style={{ color: "#7A8471" }}>{seg.surface}</p>
                  {seg.notes && <p className="text-xs mt-2 leading-relaxed" style={{ color: "#1F1F1E" }}>{seg.notes}</p>}
                </div>
              ))}
            </div>
          </div>
          {/* Live replanning */}
          <div>
            <SectionLabel>Adjust for actual progress</SectionLabel>
            <ReplanSection segments={trip.segments || []} onSaveActual={(segId, km) => onUpdateSegment && onUpdateSegment(segId, { actualKm: km })} />
          </div>
        </>}

        {/* GEAR */}
        {tab === "Gear" && <>
          <div className="rounded-2xl p-5" style={{ backgroundColor: "#0D1A0E" }}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <SectionLabel>Packed weight</SectionLabel>
                <p className="font-mono text-3xl font-semibold leading-none" style={{ color: "#F4F1EA" }}>
                  {(totalWeight/1000).toFixed(2)}<span className="text-base font-normal"> kg</span>
                </p>
                <p className="text-xs font-mono mt-1.5" style={{ color: "#7A8471" }}>{checkedItems.length} of {tripGear.length} items packed</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm" style={{ color: "#7A8471" }}>full list</p>
                <p className="font-mono text-lg" style={{ color: "#7A8471" }}>{(fullWeight/1000).toFixed(2)} kg</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1A2E1B" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width:`${fullWeight?(totalWeight/fullWeight)*100:0}%`, backgroundColor:"#7A8471" }} />
            </div>
          </div>
          {gearCategories.map(cat => {
            const items = gearByCategory(cat);
            if (!items.length) return null;
            const catWeight = items.filter(g => g.packed).reduce((s,g) => s + (g.weight||0), 0);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2.5">
                  <SectionLabel>{cat}</SectionLabel>
                  <span className="font-mono text-xs" style={{ color: "#7A8471" }}>{catWeight}g packed</span>
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} onClick={() => onTogglePacked && onTogglePacked(item.id, !item.packed)}
                      className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-opacity"
                      style={{ backgroundColor: "#E8E2D4", opacity: item.packed ? 0.6 : 1 }}>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: item.packed ? "#2D3E2F" : "transparent", border:`1.5px solid ${item.packed?"#2D3E2F":"#7A8471"}` }}>
                        {item.packed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#F4F1EA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: "#1F1F1E", textDecoration: item.packed ? "line-through" : "none" }}>{item.name}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: "#7A8471" }}>{item.brand}</p>
                      </div>
                      <span className="font-mono text-xs flex-shrink-0" style={{ color: "#7A8471" }}>{item.weight > 0 ? `${item.weight}g` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {availableToAdd.length > 0 && (
            <div>
              <button onClick={() => setShowGearPicker(v => !v)}
                className="w-full py-3 rounded-xl text-sm font-mono flex items-center justify-center gap-2"
                style={{ border: "1.5px dashed #D4CEC3", color: "#7A8471" }}>
                {showGearPicker ? "Hide library" : `+ Add from library (${availableToAdd.length})`}
              </button>
              {showGearPicker && (
                <div className="mt-2 space-y-1.5">
                  {availableToAdd.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ backgroundColor: "#E8E2D4" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: "#1F1F1E" }}>{g.name}</p>
                        <p className="text-xs font-mono" style={{ color: "#7A8471" }}>{g.brand} · {g.category} · {g.weight}g</p>
                      </div>
                      <button onClick={() => onAddGearToTrip && onAddGearToTrip(g.id)}
                        className="text-xs font-mono" style={{ color: "var(--accent, #A64B2A)" }}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>}

        {/* LOGISTICS */}
        {tab === "Logistics" && <>
          <div>
            <SectionLabel>Accommodation</SectionLabel>
            <div className="space-y-2.5">
              {(trip.accommodation||[]).map((a,i) => (
                <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: "#E8E2D4" }}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold font-serif tracking-tight" style={{ color: "#1F1F1E" }}>{a.name}</p>
                    <span className="font-mono text-sm" style={{ color: "var(--accent, #A64B2A)" }}>Night {a.night}</span>
                  </div>
                  <p className="text-xs font-mono mb-2" style={{ color: "#7A8471" }}>{a.type}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#1F1F1E" }}>{a.notes}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Key waypoints</SectionLabel>
            <div className="space-y-1.5">
              {(trip.waypoints||[]).map((wp,i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: "#E8E2D4" }}>
                  <span className="font-mono text-sm font-semibold w-12 flex-shrink-0 mt-0.5" style={{ color: "var(--accent, #A64B2A)" }}>{wp.km}km</span>
                  <div>
                    <p className="text-sm" style={{ color: "#1F1F1E" }}>{wp.name}</p>
                    {wp.notes && <p className="text-xs mt-0.5 font-mono" style={{ color: "#7A8471" }}>{wp.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* MEALS */}
          {trip.meals && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>Meal plan</SectionLabel>
                <span className="font-mono text-xs" style={{ color: "#7A8471" }}>
                  {trip.meals.reduce((s,m) => s + m.foodWeight, 0)}g food total
                </span>
              </div>
              <div className="space-y-2.5">
                {trip.meals.map((meal, i) => (
                  <MealCard key={i} meal={meal} />
                ))}
              </div>
            </div>
          )}
          <div>
            <SectionLabel>Cafes &amp; resupply</SectionLabel>            <div className="space-y-2">
              {(trip.cafes||[]).map((c,i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "#E8E2D4" }}>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium" style={{ color: "#1F1F1E" }}>{c.name}</p>
                    <span className="font-mono text-xs ml-2 flex-shrink-0" style={{ color: "#7A8471" }}>{c.distance}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#7A8471" }}>{c.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* LIVE */}
        {tab === "Live" && <>
          <div className="rounded-2xl p-5" style={{ backgroundColor: "#E8E2D4" }}>
            <SectionLabel>Location sharing</SectionLabel>
            <Toggle on={trackingOn} onToggle={() => onToggleTracking && onToggleTracking(!trackingOn)} label="Share live tracking" />
            {trackingOn && trip.trackingLink && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#F4F1EA" }}>
                <p className="text-xs font-mono mb-1.5" style={{ color: "#7A8471" }}>Shareable link</p>
                <p className="font-mono text-xs break-all" style={{ color: "#2D3E2F" }}>{trip.trackingLink}</p>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(trip.trackingLink).then(() => setCopied(true)).catch(() => {});
                      setTimeout(() => setCopied(false), 1500);
                    }
                  }}
                  className="mt-2 text-xs font-medium font-mono" style={{ color: "var(--accent, #A64B2A)" }}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            )}
          </div>
          <div>
            <SectionLabel>Current position</SectionLabel>
            <div className="relative h-40 rounded-2xl overflow-hidden" style={{ backgroundColor: "#2D3E2F" }}>
              <TopoPattern opacity={0.12} />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="font-mono text-xs tracking-widest" style={{ color: "#7A8471" }}>
                  {trackingOn ? "Awaiting first location ping" : "Tracking disabled"}
                </p>
              </div>
            </div>
          </div>
          {(trip.emergencyContacts||[]).length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#E8E2D4" }}>
              <div className="p-5">
                <SectionLabel>Emergency contacts</SectionLabel>
              </div>
              {trip.emergencyContacts.map((c) => (
                <div key={c.name} className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: "1px solid #D4CEC3" }}>
                  <p className="text-sm" style={{ color: "#1F1F1E" }}>{c.name}</p>
                  <p className="font-mono text-sm" style={{ color: "var(--accent, #A64B2A)" }}>{c.number}</p>
                </div>
              ))}
            </div>
          )}
        </>}
      </div>
    </div>
  );
};

// ─── GEAR LIBRARY ─────────────────────────────────────────────────────
const GearLibrary = ({ gearLibrary = [], onAdd }) => {
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const categories = ["All","Sleep","Cook","Wear","Ride","Safety","Documents"];
  const filtered = filter === "All" ? gearLibrary : gearLibrary.filter(g => g.category === filter);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F1EA" }}>
      <div className="px-6 pt-8 pb-4" style={{ borderBottom: "1px solid #D4CEC3" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: "#7A8471" }}>{gearLibrary.length} items · {(gearLibrary.reduce((s,g)=>s+(g.weight||0),0)/1000).toFixed(1)}kg</p>
            <h1 className="font-bold uppercase" style={{ fontSize: "2.6rem", lineHeight: 1, letterSpacing: "-0.03em", color: "#1F1F1E" }}>Gear</h1>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#0D1A0E", color: "#F4F1EA" }}>
            <span className="text-base leading-none">+</span> Add gear
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 pt-4">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: filter===c ? "#0D1A0E" : "#E8E2D4", color: filter===c ? "#F4F1EA" : "#7A8471", letterSpacing: "0.06em" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-28 space-y-2.5">
        {filtered.length === 0 && (
          <p className="font-mono text-xs mt-6" style={{ color: "#7A8471" }}>
            No gear in this category yet. Add some with the button above.
          </p>
        )}
        {filtered.map(item => (
          <div key={item.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: "#E8E2D4" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#F4F1EA" }}>
              <span className="font-mono text-xs font-semibold" style={{ color: "#7A8471" }}>{(item.category||"").slice(0,2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug" style={{ color: "#1F1F1E" }}>{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono" style={{ color: "#7A8471" }}>{item.brand}</span>
                {item.lastUsed && <span className="text-xs font-mono" style={{ color: "#7A8471" }}>· {new Date(item.lastUsed).toLocaleDateString("en-AU",{month:"short",year:"numeric"})}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-base font-semibold" style={{ color: "#1F1F1E" }}>{item.weight > 0 ? `${item.weight}g` : "—"}</p>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddGearPanel
          onClose={() => setShowAdd(false)}
          onAdd={async (item) => {
            if (onAdd) await onAdd({
              name: item.name,
              brand: item.brand,
              category: item.category,
              weight: item.weight_g ?? item.weight ?? 0,
              description: item.description,
            });
          }}
        />
      )}
    </div>
  );
};

// ─── NEW TRIP MODAL ───────────────────────────────────────────────────
const NewTripModal = ({ onClose, onSubmit, templates = [] }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:"", country:"", startDate:"", endDate:"", type:"bike", emails:"", route:"", template: templates[0]?.name || "blank" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const totalSteps = 4;
  const stepTitles = ["Trip basics","Invite friends","Import route","Gear template"];
  const update = (k,v) => setForm(f=>({...f,[k]:v}));

  const templateOptions = [
    ...templates.map(t => ({
      id: t.name,
      name: t.description || t.name,
      sub: Array.isArray(t.itemIds) ? `${t.itemIds.length} items` : "",
    })),
    { id: "blank", name: "Start empty", sub: "" },
  ];

  const submit = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setErr("Name, start date, and end date are required.");
      setStep(1);
      return;
    }
    setSubmitting(true); setErr(null);
    try {
      const emails = form.emails.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        name: form.name.trim(),
        country: form.country.trim() || undefined,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: form.template === "blank" ? undefined : form.template,
        participants: emails.map((email) => ({
          name: email.split("@")[0],
          email,
        })),
      };
      if (onSubmit) await onSubmit(payload);
    } catch (e) {
      setErr(e.message || "Could not create trip");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: "#F4F1EA" }}>
        <div className="px-6 pt-7 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-mono text-xs mb-0.5" style={{ color: "#7A8471" }}>Step {step} of {totalSteps}</p>
              <h2 className="text-xl font-semibold tracking-tight font-serif" style={{ color: "#1F1F1E" }}>{stepTitles[step-1]}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ backgroundColor: "#E8E2D4", color: "#7A8471" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex gap-1 mb-6">
            {Array.from({length:totalSteps},(_,i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ backgroundColor: i < step ? "#2D3E2F" : "#E8E2D4" }} />
            ))}
          </div>
        </div>

        <div className="px-6 pb-2 space-y-4">
          {step === 1 && <>
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Trip name</label>
              <input value={form.name} onChange={e=>update("name",e.target.value)} placeholder="e.g. Kangaroo Valley, 3 Days"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E" }} />
            </div>
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Country / region</label>
              <input value={form.country} onChange={e=>update("country",e.target.value)} placeholder="e.g. Wodi Wodi Country"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["startDate","Start date"],["endDate","End date"]].map(([k,l])=>(
                <div key={k}>
                  <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>{l}</label>
                  <input type="date" value={form[k]} onChange={e=>update(k,e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none" style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E" }} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Activity type</label>
              <div className="flex gap-2">
                {["bike","hike","mixed"].map(t=>(
                  <button key={t} onClick={()=>update("type",t)} className="flex-1 py-2.5 rounded-xl text-sm capitalize"
                    style={{ backgroundColor: form.type===t?"#2D3E2F":"#E8E2D4", color: form.type===t?"#F4F1EA":"#7A8471" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>}

          {step === 2 && (
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Invite by email</label>
              <textarea value={form.emails} onChange={e=>update("emails",e.target.value)} placeholder="sarah@example.com, marcus@example.com"
                rows={4} className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none resize-none"
                style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E" }} />
              <p className="text-xs font-mono mt-2" style={{ color: "#7A8471" }}>Separate multiple addresses with commas.</p>
            </div>
          )}

          {step === 3 && <>
            <div>
              <label className="block text-xs font-mono mb-2" style={{ color: "#7A8471" }}>Komoot or Strava URL</label>
              <input value={form.route} onChange={e=>update("route",e.target.value)} placeholder="https://www.komoot.com/tour/..."
                className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none" style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E" }} />
            </div>
            <div className="text-center py-1"><span className="text-xs font-mono" style={{ color: "#7A8471" }}>or</span></div>
            <button className="w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
              style={{ border:"1.5px dashed #D4CEC3", color:"#7A8471" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M4 6l4-4 4 4M2 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Upload .gpx file
            </button>
          </>}

          {step === 4 && <>
            <p className="text-sm leading-relaxed" style={{ color: "#7A8471" }}>Choose a starting gear template. Customise it after creating the trip.</p>
            <div className="space-y-2">
              {templateOptions.map(t=>(
                <label key={t.id} onClick={()=>update("template",t.id)}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
                  style={{ backgroundColor:"#E8E2D4", outline: form.template===t.id ? `2px solid #2D3E2F` : "none", outlineOffset:"0px" }}>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ border:`1.5px solid ${form.template===t.id?"#2D3E2F":"#7A8471"}`, backgroundColor: form.template===t.id?"#2D3E2F":"transparent" }}>
                    {form.template===t.id && <div className="w-full h-full rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color:"#1F1F1E" }}>{t.name}</p>
                    {t.sub && <p className="font-mono text-xs" style={{ color:"#7A8471" }}>{t.sub}</p>}
                  </div>
                </label>
              ))}
            </div>
          </>}
          {err && <p className="text-xs font-mono" style={{ color: "#A64B2A" }}>{err}</p>}
        </div>

        <div className="flex gap-2 p-6">
          {step > 1 && (
            <button disabled={submitting} onClick={()=>setStep(s=>s-1)} className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor:"#E8E2D4", color:"#1F1F1E", opacity: submitting ? 0.5 : 1 }}>Back</button>
          )}
          <button disabled={submitting} onClick={()=> step<totalSteps ? setStep(s=>s+1) : submit()}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor:"#2D3E2F", color:"#F4F1EA", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Creating…" : (step === totalSteps ? "Create trip" : "Continue")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── EXPORT VIEW ──────────────────────────────────────────────────────
const ExportView = ({ tripId }) => {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (!tripId) return;
    setLoading(true); setError(null);
    TraverseAPI.getTrip(tripId)
      .then(setTrip)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
      <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "#7A8471" }}>Loading trip…</p>
    </div>
  );
  if (error || !trip) return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
      <p className="font-mono text-sm" style={{ color: "#7A8471" }}>{error || "Trip not found."}</p>
    </div>
  );

  const gearGroups = ["Sleep","Cook","Wear","Ride","Safety","Documents"].map(cat => ({
    cat,
    items: (trip.gear || []).filter(g => g.category === cat),
  })).filter(group => group.items.length > 0);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F1EA" }}>
      <div className="px-6 pt-8 pb-5 flex items-end justify-between" style={{ borderBottom: "1px solid #D4CEC3" }}>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: "#7A8471" }}>Trip brief · print-ready</p>
          <h1 className="font-bold uppercase" style={{ fontSize: "2.6rem", lineHeight: 1, letterSpacing: "-0.03em", color: "#1F1F1E" }}>Export</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm mt-1"
          style={{ backgroundColor: "#E8E2D4", color: "#1F1F1E" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3 5l4 4 4-4M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Print / PDF
        </button>
      </div>

      <div className="mx-6 mb-28 rounded-2xl overflow-hidden" style={{ backgroundColor: "#F4F1EA", border:"1px solid #D4CEC3" }}>
        <div className="px-8 py-8 relative overflow-hidden" style={{ backgroundColor:"#2D3E2F" }}>
          <TopoPattern opacity={0.11} />
          <div className="relative z-10">
            <p className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color:"#7A8471" }}>Trip Brief · Traverse · {new Date().getFullYear()}</p>
            <h2 className="text-4xl font-semibold tracking-tight font-serif leading-tight mb-1" style={{ color:"#F4F1EA" }}>{trip.name}</h2>
            <p className="font-mono text-sm mb-5" style={{ color:"#7A8471" }}>{trip.country}</p>
            <div className="flex gap-8">
              {[{l:"Distance",v:`${trip.distance}km`},{l:"Elevation",v:`${trip.elevation}m`},{l:"Days",v:trip.segments?.length}].map(i=>(
                <div key={i.l}>
                  <p className="font-mono text-2xl font-semibold" style={{ color:"#F4F1EA" }}>{i.v}</p>
                  <p className="text-xs" style={{ color:"#7A8471" }}>{i.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-8 py-7 space-y-7">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <SectionLabel>Dates</SectionLabel>
              <p className="text-sm font-mono" style={{ color:"#1F1F1E" }}>
                {new Date(trip.dates.start).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"long",year:"numeric"})} – {new Date(trip.dates.end).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"long"})}
              </p>
            </div>
            <div>
              <SectionLabel>Party</SectionLabel>
              {trip.participants.map(p=><p key={p.name} className="text-sm" style={{ color:"#1F1F1E" }}>{p.name}</p>)}
            </div>
          </div>

          {trip.summary && <div style={{ borderTop:"1px solid #E8E2D4", paddingTop:"1.5rem" }}>
            <SectionLabel>Summary</SectionLabel>
            <p className="text-sm leading-relaxed" style={{ color:"#1F1F1E" }}>{trip.summary}</p>
          </div>}

          <div style={{ borderTop:"1px solid #E8E2D4", paddingTop:"1.5rem" }}>
            <SectionLabel>Route</SectionLabel>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom:"1px solid #E8E2D4" }}>
                {["Day","Segment","Dist.","Elev."].map(h=><th key={h} className="text-left pb-2 font-mono text-xs" style={{ color:"#7A8471" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(trip.segments||[]).map((s,i)=><tr key={i} style={{ borderBottom:"1px solid #F4F1EA" }}>
                  <td className="py-2 font-mono text-xs w-8" style={{ color:"#7A8471" }}>{s.day}</td>
                  <td className="py-2 pr-4" style={{ color:"#1F1F1E" }}>{s.name}</td>
                  <td className="py-2 font-mono text-xs" style={{ color:"#1F1F1E" }}>{s.distance}km</td>
                  <td className="py-2 font-mono text-xs" style={{ color:"#1F1F1E" }}>↑{s.elevation}m</td>
                </tr>)}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop:"1px solid #E8E2D4", paddingTop:"1.5rem" }}>
            <SectionLabel>Gear list</SectionLabel>
            {gearGroups.length === 0 && (
              <p className="text-xs font-mono" style={{ color:"#7A8471" }}>No gear attached yet.</p>
            )}
            {gearGroups.map(({ cat, items })=> (
              <div key={cat} className="mb-4">
                <p className="text-xs font-mono mb-1.5 uppercase tracking-widest" style={{ color:"#7A8471" }}>{cat}</p>
                {items.map(item=>(
                  <div key={item.id} className="flex justify-between py-1.5" style={{ borderBottom:"1px solid #F4F1EA" }}>
                    <p className="text-xs" style={{ color:"#1F1F1E" }}>{item.name}</p>
                    <p className="font-mono text-xs" style={{ color:"#7A8471" }}>{item.weight>0?`${item.weight}g`:"—"}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop:"1px solid #E8E2D4", paddingTop:"1.5rem" }}>
            <SectionLabel>Waypoints</SectionLabel>
            {(trip.waypoints||[]).map((wp,i)=>(
              <div key={i} className="flex gap-5 py-1.5" style={{ borderBottom:"1px solid #F4F1EA" }}>
                <span className="font-mono text-xs w-12 flex-shrink-0" style={{ color:"#A64B2A" }}>{wp.km}km</span>
                <span className="text-xs" style={{ color:"#1F1F1E" }}>{wp.name}</span>
                {wp.notes && <span className="text-xs ml-auto" style={{ color:"#7A8471" }}>{wp.notes}</span>}
              </div>
            ))}
          </div>

          {(trip.emergencyContacts||[]).length > 0 && (
            <div style={{ borderTop:"1px solid #E8E2D4", paddingTop:"1.5rem" }}>
              <SectionLabel>Emergency contacts</SectionLabel>
              {trip.emergencyContacts.map(c=>(
                <div key={c.name} className="flex justify-between py-1.5" style={{ borderBottom:"1px solid #F4F1EA" }}>
                  <span className="text-xs" style={{ color:"#1F1F1E" }}>{c.name}</span>
                  <span className="font-mono text-xs" style={{ color:"#A64B2A" }}>{c.number}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TripsDashboard, TripDetail, GearLibrary, NewTripModal, ExportView, AddGearPanel, ReplanSection });
