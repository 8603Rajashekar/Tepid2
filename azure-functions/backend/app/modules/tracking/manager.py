from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.admin_connections: list[WebSocket] = []
        self.agent_connections: dict[str, list[WebSocket]] = {}

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)

    async def connect_agent(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.agent_connections:
            self.agent_connections[user_id] = []
        self.agent_connections[user_id].append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    def disconnect_agent(self, user_id: str, websocket: WebSocket):
        if user_id in self.agent_connections:
            self.agent_connections[user_id].remove(websocket)
            if not self.agent_connections[user_id]:
                del self.agent_connections[user_id]

    async def broadcast_to_admins(self, message: dict):
        dead = []
        for ws in self.admin_connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.admin_connections.remove(ws)

    @property
    def connected_admins(self) -> int:
        return len(self.admin_connections)

    @property
    def connected_agents(self) -> list[str]:
        return list(self.agent_connections.keys())


manager = ConnectionManager()
