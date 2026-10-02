"""IdentityAuthority — single authority for identity generation.

Every UUID/identity in the system originates from this class.
No worker or tool calls uuid.uuid4() directly.
Uses uuidv7 (RFC 9562) backed by PostgreSQL when available, pure-Python otherwise.
"""

import os
import uuid
import time
from typing import Optional


def _pure_python_uuidv7() -> str:
    """Generate UUID v7 string (RFC 9562) using pure Python.

    Layout: unix_ts_ms (48 bits) | ver 0x7 (4 bits) | rand_a (12 bits)
            var 0x2 (2 bits)     | rand_b (62 bits)
    """
    ts = int(time.time() * 1000)
    b = bytearray(16)

    # Bytes 0-5: 48-bit Unix timestamp (big-endian)
    b[0] = (ts >> 40) & 0xff
    b[1] = (ts >> 32) & 0xff
    b[2] = (ts >> 24) & 0xff
    b[3] = (ts >> 16) & 0xff
    b[4] = (ts >> 8) & 0xff
    b[5] = ts & 0xff

    # Bytes 6-7: version (0x7) + rand_a (12 bits)
    rand_bytes = os.urandom(10)
    b[6] = 0x70 | (rand_bytes[0] >> 4)  # top 4 bits version, bottom 4 bits rand
    b[7] = ((rand_bytes[0] << 4) | (rand_bytes[1] >> 4)) & 0xff  # remaining 8 bits rand_a

    # Byte 8: variant (0x8) + rand_b (2 bits)
    b[8] = 0x80 | (rand_bytes[1] & 0x0f)

    # Bytes 9-15: remaining 56 bits rand_b
    b[9] = rand_bytes[2]
    b[10] = rand_bytes[3]
    b[11] = rand_bytes[4]
    b[12] = rand_bytes[5]
    b[13] = rand_bytes[6]
    b[14] = rand_bytes[7]
    b[15] = rand_bytes[8]

    h = b.hex()
    return f'{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}'


class IdentityAuthority:
    """Single authority for generating identities using UUID v7 (RFC 9562)."""

    _pg_available: Optional[bool] = None

    @classmethod
    def _check_pg(cls) -> bool:
        if cls._pg_available is None:
            try:
                from runtime.adapters.repository_adapter import RepositoryAdapter
                adapter = RepositoryAdapter.get_instance()
                adapter._ensure_pool()
                conn = adapter._pool.getconn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT uuidv7()")
                    cls._pg_available = True
                except Exception:
                    cls._pg_available = False
                finally:
                    adapter._pool.putconn(conn)
            except Exception:
                cls._pg_available = False
        return cls._pg_available

    @classmethod
    def generate_id(cls) -> str:
        """Generate a UUID v7. Prefers PostgreSQL uuidv7(), falls back to pure Python.

        The result is a uuid7 string (time-ordered, monotonically increasing).
        """
        if cls._pg_available or cls._check_pg():
            try:
                from runtime.adapters.repository_adapter import RepositoryAdapter
                adapter = RepositoryAdapter.get_instance()
                conn = adapter._pool.getconn()
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT uuidv7()")
                    return str(cur.fetchone()[0])
                finally:
                    adapter._pool.putconn(conn)
            except Exception:
                pass
        return _pure_python_uuidv7()

    @staticmethod
    def generate_deterministic_id(namespace: str, name: str) -> str:
        """Generate a deterministic UUID v5 from namespace and name."""
        ns_uuid = uuid.NAMESPACE_DNS if namespace == 'dns' else uuid.NAMESPACE_URL
        return str(uuid.uuid5(ns_uuid, name))

    @staticmethod
    def generate_short_id() -> str:
        """Generate a short (8 char) hex identifier for internal use."""
        import hashlib
        return hashlib.sha256(os.urandom(8)).hexdigest()[:8]
