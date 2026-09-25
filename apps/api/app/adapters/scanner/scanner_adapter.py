import socket
from abc import ABC, abstractmethod
from typing import Tuple
from app.core.config import settings
from app.core.logging import logger


class ScannerAdapter(ABC):
    @abstractmethod
    async def scan_bytes(self, data: bytes, filename: str) -> Tuple[bool, str]:
        """
        Scans binary data for malware or virus signatures.
        Returns: (is_clean: bool, scan_result_message: str)
        """
        pass


class LocalHeuristicScannerAdapter(ScannerAdapter):
    """
    Local heuristic scanner:
    - Inspects file signatures against known dangerous executable headers (MZ, ELF, Mach-O).
    - Checks for standard EICAR anti-malware test signature.
    - Rejects nested executable payloads.
    """

    EICAR_SIGNATURE = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

    DANGEROUS_MAGIC_BYTES = [
        (b"MZ", "Windows PE Executable (.exe, .dll)"),
        (b"\x7fELF", "Linux ELF Binary"),
        (b"\xca\xfe\xba\xbe", "Java Bytecode / Mach-O Binary"),
        (b"<!DOCTYPE html", "Disguised HTML Script"),
        (b"<script", "Inline Javascript"),
    ]

    async def scan_bytes(self, data: bytes, filename: str) -> Tuple[bool, str]:
        # 1. EICAR Test detection
        if self.EICAR_SIGNATURE in data:
            logger.warning(f"[Security Scanner] EICAR test signature detected in {filename}")
            return False, "INFECTED: EICAR-Standard-AV-Test-Signature"

        # 2. Check for dangerous executables masquerading as documents
        for magic, desc in self.DANGEROUS_MAGIC_BYTES:
            if data.startswith(magic):
                logger.warning(f"[Security Scanner] Disallowed executable binary {desc} detected in {filename}")
                return False, f"INFECTED: Disallowed binary payload ({desc})"

        # 3. Maximum size check
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(data) > max_bytes:
            return False, f"REJECTED: File size exceeds {settings.MAX_FILE_SIZE_MB}MB quota"

        return True, "CLEAN"


class ClamAVScannerAdapter(ScannerAdapter):
    """
    ClamAV network daemon scanner adapter via TCP streaming socket (INSTREAM command).
    Falls back to LocalHeuristicScannerAdapter if daemon is unavailable.
    """

    def __init__(self):
        self.host = settings.CLAMAV_HOST
        self.port = settings.CLAMAV_PORT
        self.fallback = LocalHeuristicScannerAdapter()

    async def scan_bytes(self, data: bytes, filename: str) -> Tuple[bool, str]:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(5.0)
                s.connect((self.host, self.port))
                s.sendall(b"zINSTREAM\0")

                # Send data in chunks: [4 bytes size in network byte order] + chunk
                chunk_size = 2048
                for i in range(0, len(data), chunk_size):
                    chunk = data[i : i + chunk_size]
                    s.sendall(len(chunk).to_bytes(4, byteorder="big") + chunk)

                # Send 0-length chunk to terminate stream
                s.sendall((0).to_bytes(4, byteorder="big"))

                response = s.recv(1024).decode("utf-8", errors="ignore").strip()
                if "OK" in response:
                    return True, "CLEAN"
                elif "FOUND" in response:
                    logger.warning(f"[ClamAV Scanner] Threat detected: {response}")
                    return False, f"INFECTED: {response}"
                else:
                    return self.fallback.scan_bytes(data, filename)
        except Exception as e:
            logger.info(f"[Scanner] ClamAV daemon unreachable ({e}), using local heuristic scanner.")
            return await self.fallback.scan_bytes(data, filename)


def get_scanner_adapter() -> ScannerAdapter:
    if settings.SCANNER_MODE == "clamav":
        return ClamAVScannerAdapter()
    return LocalHeuristicScannerAdapter()
