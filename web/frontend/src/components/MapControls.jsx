import React from "react";

export default function MapControls({ onReset, onSave }) {
  return (
    <div className="map-controls">
      <button className="map-btn" onClick={onReset}>
        Reset route
      </button>
      <button className="map-btn" onClick={onSave}>
        Save route
      </button>
    </div>
  );
}
