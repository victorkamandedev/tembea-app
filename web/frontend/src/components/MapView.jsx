import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapControls from "./MapControls";
import SavedRoutes from "./SavedRoutes";
import "../styles/mapLayout.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  const [points, setPoints] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // Holds distance & duration

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
        paint: { "line-color": "#ff0000", "line-width": 4 },
      });
    });
  }, []);

  // Handle map clicks and routing
  useEffect(() => {
    if (!map.current) return;

    const handleClick = async (e) => {
      if (points.length >= 2) return;

      const point = [e.lngLat.lng, e.lngLat.lat];

      const marker = new mapboxgl.Marker({
        color: points.length === 0 ? "green" : "red",
      })
        .setLngLat(point)
        .addTo(map.current);

      markersRef.current.push(marker);

      const newPoints = [...points, point];
      setPoints(newPoints);

      if (newPoints.length === 2) {
        const [start, end] = newPoints;

        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.length) {
          const routeGeo = data.routes[0].geometry;
          map.current.getSource("route").setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: routeGeo }],
          });

          // Set distance in km & duration in minutes
          const distance = (data.routes[0].distance / 1000).toFixed(2); // km
          const duration = Math.ceil(data.routes[0].duration / 60); // min
          setRouteInfo({ distance, duration });
        }
      }
    };

    map.current.on("click", handleClick);
    return () => map.current.off("click", handleClick);
  }, [points]);

  const resetMap = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setPoints([]);
    setRouteInfo(null);

    const source = map.current.getSource("route");
    if (source) {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  };

  const saveRoute = async () => {
    if (points.length !== 2) {
      alert("Place both start and end markers before saving!");
      return;
    }

    const routeSource = map.current.getSource("route");
    const geojson = routeSource._data?.features[0]?.geometry;

    if (!geojson) {
      alert("Route geometry is missing.");
      return;
    }

    let name = prompt("Enter a name for this route:", `Route ${new Date().toLocaleString()}`);
    if (!name) name = `Route ${new Date().toLocaleString()}`;

    const routeDoc = {
      name,
      geometry: geojson,
      start: { lat: points[0][1], lng: points[0][0] },
      end: { lat: points[1][1], lng: points[1][0] },
      distance: routeInfo?.distance || null,
      duration: routeInfo?.duration || null,
      createdAt: new Date(),
    };

    try {
      await fetch("http://localhost:5000/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeDoc),
      });
      alert("Route saved successfully!");
    } catch (err) {
      console.error("Error saving route:", err);
      alert("Failed to save route.");
    }
  };

  const loadRoute = (route) => {
    if (!route.geometry || !route.start || !route.end) return;

    resetMap();

    const startMarker = new mapboxgl.Marker({ color: "green" })
      .setLngLat([route.start.lng, route.start.lat])
      .addTo(map.current);
    const endMarker = new mapboxgl.Marker({ color: "red" })
      .setLngLat([route.end.lng, route.end.lat])
      .addTo(map.current);

    markersRef.current.push(startMarker, endMarker);
    setPoints([
      [route.start.lng, route.start.lat],
      [route.end.lng, route.end.lat],
    ]);

    const routeSource = map.current.getSource("route");
    if (routeSource) {
      routeSource.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: route.geometry }],
      });
    }

    // Set route info
    setRouteInfo({
      distance: route.distance,
      duration: route.duration,
    });

    map.current.flyTo({ center: [route.start.lng, route.start.lat], zoom: 13 });
  };

  return (
    <div className="app-layout">
      <div className="map-section">
        {/* Route info above map */}
        {routeInfo && (
          <div className="route-info">
            Distance: {routeInfo.distance} km | Duration: {routeInfo.duration} min
          </div>
        )}
        <div ref={mapContainer} className="map-container" />
      </div>
      <div className="sidebar">
        <MapControls onReset={resetMap} onSave={saveRoute} />
        <SavedRoutes loadRoute={loadRoute} />
      </div>
    </div>
  );
}
