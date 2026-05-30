from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.modules.tracking.manager import manager
from app.modules.tracking.model import TaskLocation

router = APIRouter()

ADMIN_ROLES = {"admin", "super_admin"}


def _decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return {
            "user_id": payload.get("sub"),
            "roles": payload.get("roles", []),
        }
    except JWTError:
        return None


@router.websocket("/ws/location")
async def websocket_location(
    websocket: WebSocket,
    token: str = Query(...),
):
    user_info = _decode_token(token)

    if not user_info or not user_info["user_id"]:
        await websocket.close(code=1008)
        return

    user_id = user_info["user_id"]
    is_admin = bool(set(user_info["roles"]) & ADMIN_ROLES)

    if is_admin:
        await manager.connect_admin(websocket)
        try:
            while True:
                # Admins stay connected to receive broadcasts; ignore any data they send
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect_admin(websocket)
    else:
        await manager.connect_agent(user_id, websocket)
        try:
            while True:
                data = await websocket.receive_json()
                data["user_id"] = user_id

                # Persist to DB
                async with AsyncSessionLocal() as db:
                    loc = TaskLocation(
                        task_id=UUID(data["task_id"]),
                        user_id=UUID(user_id),
                        latitude=data["latitude"],
                        longitude=data["longitude"],
                    )
                    db.add(loc)
                    await db.commit()

                # Broadcast enriched payload to all admins only
                await manager.broadcast_to_admins(data)

        except WebSocketDisconnect:
            manager.disconnect_agent(user_id, websocket)


@router.websocket("/ws/admin")
async def websocket_admin(
    websocket: WebSocket,
    token: str = Query(...),
):
    user_info = _decode_token(token)

    if not user_info or not bool(set(user_info.get("roles", [])) & ADMIN_ROLES):
        await websocket.close(code=1008)
        return

    await manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
