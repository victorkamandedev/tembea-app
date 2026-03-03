import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapControls from "./MapControls";
import SavedRoutes from "./SavedRoutes";
import "../styles/mapLayout.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const savedRoutesRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouting, setIsRouting] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [36.8219, -1.2921],
      zoom: 12,
    });

    map.current.on("load", () => {
      map.current.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.current.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 4 },
      });
    });
  }, []);

  // Fetch route between all current points (multi-waypoint)
  const fetchRoute = useCallback(async (pts) => {
    if (pts.length < 2) return;
    setIsRouting(true);

    try {
      const coords = pts.map((p) => `${p[0]},${p[1]}`).join(";");
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes?.length) {
        const routeGeo = data.routes[0].geometry;
        map.current.getSource("route").setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: routeGeo }],
        });

        const distance = (data.routes[0].distance / 1000).toFixed(2);
        const duration = Math.ceil(data.routes[0].duration / 60);
        setRouteInfo({ distance, duration, geometry: routeGeo });
      }
    } catch (err) {
      console.error("Routing error:", err);
    } finally {
      setIsRouting(false);
    }
  }, []);

  // Handle map clicks — unlimited waypoints
  useEffect(() => {
    if (!map.current) return;

    const handleClick = async (e) => {
      const point = [e.lngLat.lng, e.lngLat.lat];

      // Colour: green for start, red for end, blue for waypoints
      const isFirst = points.length === 0;
      const markerColor = isFirst ? "#16a34a" : "#2563eb";

      // Update previous last marker from red → blue (it's now a waypoint)
      if (markersRef.current.length > 0) {
        const prevLast = markersRef.current[markersRef.current.length - 1];
        prevLast.getElement().style.filter =
          "hue-rotate(200deg) saturate(2)"; // turn existing "end" blue
      }

      const marker = new mapboxgl.Marker({ color: markerColor })
        .setLngLat(point)
        .addTo(map.current);

      // Always make the newest marker red (end)
      marker.getElement().style.filter = "none";
      if (!isFirst) {
        marker.getElement().style.filter =
          "hue-rotate(0deg)"; // red stays red
      }

      markersRef.current.push(marker);

      const newPoints = [...points, point];
      setPoints(newPoints);

      if (newPoints.length >= 2) {
        await fetchRoute(newPoints);
      }
    };

    map.current.on("click", handleClick);
    return () => map.current.off("click", handleClick);
  }, [points, fetchRoute]);

  const resetMap = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setPoints([]);
    setRouteInfo(null);

    const source = map.current?.getSource("route");
    if (source) {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, []);

  // Remove last waypoint (undo)
  const undoLastPoint = useCallback(async () => {
    if (points.length === 0) return;

    const lastMarker = markersRef.current.pop();
    lastMarker.remove();

    const newPoints = points.slice(0, -1);
    setPoints(newPoints);

    if (newPoints.length >= 2) {
      await fetchRoute(newPoints);
    } else {
      // Clear route line
      const source = map.current?.getSource("route");
      if (source) {
        source.setData({ type: "FeatureCollection", features: [] });
      }
      setRouteInfo(null);
    }
  }, [points, fetchRoute]);

  const saveRoute = useCallback(async () => {
    if (points.length < 2) {
      alert("Add at least a start and end point before saving.");
      return;
    }

    if (!routeInfo?.geometry) {
      alert("Route geometry is missing — try clicking the map again.");
      return;
    }

    let name = prompt(
      "Name this route:",
      `Route ${new Date().toLocaleString()}`
    );
    if (name === null) return; // user cancelled
    if (!name.trim()) name = `Route ${new Date().toLocaleString()}`;

    // v1.1-ready schema: userId and isPublic are included as defaults
    // Swap in the real Firebase UID for userId when auth is added
    const routeDoc = {
      name: name.trim(),
      geometry: routeInfo.geometry,
      waypoints: points.map((p) => ({ lng: p[0], lat: p[1] })),
      start: { lat: points[0][1], lng: points[0][0] },
      end: { lat: points[points.length - 1][1], lng: points[points.length - 1][0] },
      distance: parseFloat(routeInfo.distance),   // stored as Number, not String
      duration: routeInfo.duration,
      usageCount: 0,      // v2.0 analytics
      isPublic: false,    // v3.0 community toggle
      userId: null,       // replace with Firebase UID in v1.1
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeDoc),
      });

      if (!res.ok) throw new Error("Server error");

      // Refresh the saved routes list without a full page reload
      savedRoutesRef.current?.refresh();
      alert("Route saved!");
    } catch (err) {
      console.error("Error saving route:", err);
      alert("Failed to save route. Please try again.");
    }
  }, [points, routeInfo]);

  const loadRoute = useCallback((route) => {
    if (!route.geometry || !route.start || !route.end) return;

    resetMap();

    // Restore all waypoints if available, otherwise just start/end
    const pts = route.waypoints?.length
      ? route.waypoints.map((wp) => [wp.lng, wp.lat])
      : [
          [route.start.lng, route.start.lat],
          [route.end.lng, route.end.lat],
        ];

    pts.forEach((pt, i) => {
      const color =
        i === 0 ? "#16a34a" : i === pts.length - 1 ? "#dc2626" : "#2563eb";
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(pt)
        .addTo(map.current);
      markersRef.current.push(marker);
    });

    setPoints(pts);

    const routeSource = map.current.getSource("route");
    if (routeSource) {
      routeSource.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: route.geometry }],
      });
    }

    setRouteInfo({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
    });

    map.current.flyTo({ center: [route.start.lng, route.start.lat], zoom: 13 });
  }, [resetMap]);

  return (
    <div className="app-layout">
      <div className="map-section">
        {routeInfo && (
          <div className="route-info-bar">
            <span>📍 {points.length} points</span>
            <span>🚶 {routeInfo.distance} km</span>
            <span>⏱ {routeInfo.duration} min</span>
            {isRouting && <span className="routing-spinner">Calculating…</span>}
          </div>
        )}
        {isRouting && !routeInfo && (
          <div className="route-info-bar">
            <span className="routing-spinner">Calculating route…</span>
          </div>
        )}
        <div ref={mapContainer} className="map-container" />
      </div>

      <div className="sidebar">
        <MapControls
          onReset={resetMap}
          onSave={saveRoute}
          onUndo={undoLastPoint}
          canUndo={points.length > 0}
          pointCount={points.length}
        />
        <SavedRoutes ref={savedRoutesRef} loadRoute={loadRoute} />
      </div>
    </div>
  );
}
