import { useEffect, useRef, useState } from "react";

const WS_URL = `${process.env.REACT_APP_WS_URL}/api/v1/ws/admin`;

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f97316", "#a855f7", "#06b6d4"];

export default function useTracking(token) {
  const [locations, setLocations] = useState({});   // latest position per agent
  const [paths, setPaths] = useState({});           // full path history per agent
  const [colors, setColors] = useState({});         // stable color per agent
  const [connected, setConnected] = useState(false);
  const colorIndexRef = useRef(0);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { user_id, latitude, longitude } = data;

      // Assign stable color on first appearance
      setColors((prev) => {
        if (prev[user_id]) return prev;
        const color = COLORS[colorIndexRef.current % COLORS.length];
        colorIndexRef.current += 1;

        // Browser notification for new agent
        if (Notification.permission === "granted") {
          new Notification("Agent Online", {
            body: `Agent ${user_id.slice(0, 8)} connected`,
          });
        }

        return { ...prev, [user_id]: color };
      });

      // Update latest position
      setLocations((prev) => ({ ...prev, [user_id]: data }));

      // Append to path history
      setPaths((prev) => ({
        ...prev,
        [user_id]: [...(prev[user_id] || []), [latitude, longitude]],
      }));
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = (e) => {
      console.log("WebSocket disconnected", e.code);
      setConnected(false);
    };

    return () => ws.close();
  }, [token]);

  return { locations, paths, colors, connected };
}
