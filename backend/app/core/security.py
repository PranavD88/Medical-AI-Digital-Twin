import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

pwdContext = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)

MAX_PASSWORD_LENGTH = 72


def hashPassword(password: str) -> str:
    return pwdContext.hash(password)


def verifyPassword(plainPassword: str, hashedPassword: str) -> bool:
    try:
        return pwdContext.verify(plainPassword, hashedPassword)
    except Exception:
        return False


def getFernet() -> Fernet:
    key = os.getenv("FERNET_KEY")
    if not key:
        raise RuntimeError("FERNET_KEY not set in environment")
    return Fernet(key.encode())


def encryptData(data: str) -> str:
    return getFernet().encrypt(data.encode()).decode()


def decryptData(token: Optional[str]) -> Optional[str]:
    if token is None:
        return None

    try:
        return getFernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return token
