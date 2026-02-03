import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;
export default function SavedRoutes({ loadRoute }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all routes from backend
  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/routes`);
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      console.error("Error fetching routes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // Delete a route
  const deleteRoute = async (id) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    try {
      await fetch(`${API_URL}/routes/${id}`, {
        method: "DELETE",
      });
      // Refresh routes list
      fetchRoutes();
    } catch (err) {
      console.error("Error deleting route:", err);
      alert("Failed to delete route.");
    }
  };

  if (loading) return <p>Loading saved routes...</p>;
  if (!routes.length) return <p>No saved routes yet.</p>;

  return (
    <div className="saved-routes" style={{ maxHeight: "calc(100vh - 20px)", overflowY: "auto" }}>
      <h2>Saved Routes</h2>
      <ul>
        {routes.map((route) => (
          <li key={route._id} className="route-card">
            <button
              className="route-info"
              onClick={() => loadRoute(route)}
            >
              {route.name}
              <div className="route-meta">
                {route.distance && <>Distance: {route.distance} km</>}
                {route.duration && <>Duration: {route.duration} min</>}
              </div>
            </button>
            <button className="delete-btn" onClick={() => deleteRoute(route._id)}>
              &times;
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
