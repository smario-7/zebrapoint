"""
Operacje na hasłach (bcrypt). Izolacja ułatwia późniejszą podmianę na argon2.
"""
import bcrypt

_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    raw = bcrypt.hashpw(
        password.encode("utf-8")[:_BCRYPT_MAX_BYTES],
        bcrypt.gensalt(rounds=12),
    )
    return raw.decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8")[:_BCRYPT_MAX_BYTES],
        hashed.encode("ascii"),
    )
