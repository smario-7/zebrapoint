import logging
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import WebSocket


logger = logging.getLogger(__name__)


class ChatManager:
    """
    Zarządza aktywnymi połączeniami WebSocket pogrupowanymi po group_id.

    Struktura:
        connections = {
            "group-uuid-1": [ws_userA, ws_userB],
            "group-uuid-2": [ws_userC],
        }

    Na potrzeby MVP działa w jednym procesie aplikacji.
    Przy skalowaniu horyzontalnym trzeba będzie zastąpić to
    mechanizmem typu Redis pub/sub.
    """

    def __init__(self) -> None:
        # group_id (str) → lista aktywnych WebSocketów
        self.connections: Dict[str, List[WebSocket]] = defaultdict(list)
        # websocket → metadane: user_id, display_name, group_id
        self.metadata: Dict[WebSocket, Dict] = {}

    def register_accepted(
        self,
        websocket: WebSocket,
        group_id: str,
        user_id: str,
        display_name: str,
    ) -> None:
        """Rejestruje już zaakceptowane połączenie WebSocket."""
        self.connections[group_id].append(websocket)
        self.metadata[websocket] = {
            "user_id": user_id,
            "display_name": display_name,
            "group_id": group_id,
        }
        logger.info(
            "WebSocket connected: user=%s group=%s (total in group: %s)",
            display_name,
            group_id,
            len(self.connections[group_id]),
        )

    async def connect(
        self,
        websocket: WebSocket,
        group_id: str,
        user_id: str,
        display_name: str,
    ) -> None:
        """Akceptuje połączenie WebSocket i rejestruje je w pamięci."""
        await websocket.accept()
        self.register_accepted(websocket, group_id, user_id, display_name)

    def disconnect(self, websocket: WebSocket) -> Optional[Dict]:
        """
        Usuwa połączenie WebSocket z pamięci.
        Zwraca metadane rozłączonego użytkownika (albo None).
        """
        meta = self.metadata.pop(websocket, None)
        if not meta:
            return None

        group_id = meta["group_id"]
        try:
            self.connections[group_id].remove(websocket)
        except ValueError:
            # Połączenie mogło zostać usunięte wcześniej.
            pass

        if not self.connections[group_id]:
            del self.connections[group_id]

        logger.info(
            "WebSocket disconnected: user=%s group=%s",
            meta.get("display_name"),
            group_id,
        )
        return meta

    async def broadcast(
        self,
        message: Dict,
        group_id: str,
        exclude_ws: Optional[WebSocket] = None,
    ) -> None:
        """
        Wysyła wiadomość JSON do wszystkich połączeń w danej grupie.
        Opcjonalnie można wykluczyć jedno połączenie (np. nadawcę).
        """
        dead: List[WebSocket] = []

        for ws in self.connections.get(group_id, []):
            if ws is exclude_ws:
                continue
            try:
                await ws.send_json(message)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Nie można wysłać wiadomości przez WebSocket: %s", exc)
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

    async def send_personal(self, message: Dict, websocket: WebSocket) -> None:
        """Wysyła wiadomość tylko do jednego połączenia WebSocket."""
        try:
            await websocket.send_json(message)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Nie można wysłać wiadomości do pojedynczego WebSocket: %s", exc)

    def get_group_count(self, group_id: str) -> int:
        """Zwraca liczbę aktywnych połączeń w danej grupie."""
        return len(self.connections.get(group_id, []))

    def get_online_users(self, group_id: str) -> List[str]:
        """Zwraca listę nazw wyświetlanych aktywnych użytkowników w grupie."""
        return [
            self.metadata[ws]["display_name"]
            for ws in self.connections.get(group_id, [])
            if ws in self.metadata
        ]


manager = ChatManager()

