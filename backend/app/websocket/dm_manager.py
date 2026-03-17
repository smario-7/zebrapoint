from collections import defaultdict
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class DmManager:
    """
    Manager połączeń WebSocket dla DM.
    Przechowuje listę połączeń per konwersacja i wysyła do nich wiadomości.
    """

    def __init__(self):
        self.connections = defaultdict(list)
        self.metadata = {}

    async def connect(
        self,
        websocket: WebSocket,
        conversation_id: str,
        user_id: str,
    ):
        await websocket.accept()
        self.connections[conversation_id].append(websocket)
        self.metadata[websocket] = {
            "user_id": user_id,
            "conversation_id": conversation_id,
        }

    def disconnect(self, websocket: WebSocket):
        meta = self.metadata.pop(websocket, None)
        if meta:
            cid = meta["conversation_id"]
            try:
                self.connections[cid].remove(websocket)
            except ValueError:
                pass
            if not self.connections[cid]:
                del self.connections[cid]

    async def broadcast_conversation(self, message: dict, conversation_id: str):
        """Wysyła wiadomość do wszystkich klientów w danej konwersacji."""
        dead = []
        for ws in self.connections.get(conversation_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_personal(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning("send_personal error: %s", e)


dm_manager = DmManager()
