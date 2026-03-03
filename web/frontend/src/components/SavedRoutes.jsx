import { useEffect, useState, forwardRef, useImperativeHandle } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const SavedRoutes = forwardRef(function SavedRoutes({ loadRoute }, ref) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/routes`);
      if (!res.ok) throw new Error("Failed to load routes");
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      console.error("Error fetching routes:", err);
      setError("Could not load routes.");
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh() so parent (MapView) can call it after a save
  useImperativeHandle(ref, () => ({
    refresh: fetchRoutes,
  }));

  useEffect(() => {
    fetchRoutes();
  }, []);

  const deleteRoute = async (id, e) => {
    e.stopPropagation(); // prevent triggering loadRoute
    if (!window.confirm("Delete this route?")) return;
    try {
      const res = await fetch(`${API_URL}/routes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      // Optimistic update — remove immediately without re-fetch
      setRoutes((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Error deleting route:", err);
      alert("Failed to delete route.");
    }
  };

  return (
    <div className="saved-routes">
      <div className="saved-routes-header">
        <h2>Saved Routes</h2>
        <button className="refresh-btn" onClick={fetchRoutes} title="Refresh">
          ↻
        </button>
      </div>

      {loading && <p className="routes-status">Loading routes…</p>}
      {error && <p className="routes-status routes-status--error">{error}</p>}

      {!loading && !error && routes.length === 0 && (
        <p className="routes-status">No saved routes yet. Create one above!</p>
      )}

      {!loading && !error && routes.length > 0 && (
        <ul className="routes-list">
          {routes.map((route) => (
            <li key={route._id} className="route-card">
              <button
                className="route-card__body"
                onClick={() => loadRoute(route)}
              >
                <span className="route-card__name">{route.name}</span>
                <span className="route-card__meta">
                  {route.distance != null && `${route.distance} km`}
                  {route.distance != null && route.duration != null && " · "}
                  {route.duration != null && `${route.duration} min`}
                  {route.waypoints?.length > 2 && (
                    <> · {route.waypoints.length} points</>
                  )}
                </span>
              </button>
              <button
                className="route-card__delete"
                onClick={(e) => deleteRoute(route._id, e)}
                title="Delete route"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default SavedRoutes;
