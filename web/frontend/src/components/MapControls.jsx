import React from "react";

export default function MapControls({ onReset, onSave, onUndo, canUndo, pointCount }) {
  return (
    <div className="map-controls">
      <div className="map-controls-hint">
        {pointCount === 0 && <p>Click the map to add your starting point.</p>}
        {pointCount === 1 && <p>Click to add more waypoints or your end point.</p>}
        {pointCount >= 2 && <p>{pointCount} points added. Keep clicking to add waypoints.</p>}
      </div>

      <button
        className="map-btn map-btn--secondary"
        onClick={onUndo}
        disabled={!canUndo}
      >
        ↩ Undo last point
      </button>

      <button className="map-btn map-btn--danger" onClick={onReset}>
        Reset route
      </button>

      <button
        className="map-btn map-btn--primary"
        onClick={onSave}
        disabled={pointCount < 2}
      >
        Save route
      </button>
    </div>
  );
}
