import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Auto-pans map to the most recently updated agent
function AutoFocus({ locations }) {
  const map = useMap();
  const entries = Object.values(locations);
  const latest = entries[entries.length - 1];

  useEffect(() => {
    if (latest) {
      map.setView([latest.latitude, latest.longitude], map.getZoom());
    }
  }, [latest, map]);

  return null;
}

// Colored circle marker icon per agent
function coloredIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapView({ locations, paths, colors }) {
  const entries = Object.values(locations);

  return (
    <MapContainer center={[17.3850, 78.4867]} zoom={13} style={{ height: "100vh" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoFocus locations={locations} />

      {/* Route polylines */}
      {Object.entries(paths).map(([userId, coords]) =>
        coords.length > 1 ? (
          <Polyline
            key={userId}
            positions={coords}
            pathOptions={{ color: colors[userId] || "#3b82f6", weight: 3, opacity: 0.7 }}
          />
        ) : null
      )}

      {/* Agent markers */}
      {entries.map((loc) => (
        <Marker
          key={loc.user_id}
          position={[loc.latitude, loc.longitude]}
          icon={coloredIcon(colors[loc.user_id] || "#3b82f6")}
        >
          <Popup>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <b>Agent</b>: {loc.user_id.slice(0, 8)}…<br />
              <b>Task</b>: {loc.task_id ? loc.task_id.slice(0, 8) + "…" : "—"}<br />
              <b>Status</b>: {loc.status || "—"}<br />
              <b>Lat</b>: {loc.latitude.toFixed(5)}<br />
              <b>Lng</b>: {loc.longitude.toFixed(5)}<br />
              <b>Points</b>: {(paths[loc.user_id] || []).length}
            </div>
          </Popup>
        </Marker>
      ))}

      {entries.length === 0 && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "white", padding: "8px 16px", borderRadius: 6,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000, fontSize: 13,
        }}>
          Waiting for agent location updates…
        </div>
      )}
    </MapContainer>
  );
}
