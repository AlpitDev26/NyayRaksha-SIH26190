import json
import logging
import sys
import time
from typing import Any, Dict, Optional


class JSONFormatter(logging.Formatter):
    """Structured JSON formatter with sensitive field redaction."""

    SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "cookie", "private_key", "key"}

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include custom attributes if present
        if hasattr(record, "correlation_id"):
            log_data["correlation_id"] = getattr(record, "correlation_id")
        if hasattr(record, "actor_id"):
            log_data["actor_id"] = getattr(record, "actor_id")
        if hasattr(record, "action"):
            log_data["action"] = getattr(record, "action")
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Sanitize sensitive fields if extra dict is passed
        if hasattr(record, "details") and isinstance(record.details, dict):
            sanitized = {}
            for k, v in record.details.items():
                if any(sens in k.lower() for sens in self.SENSITIVE_KEYS):
                    sanitized[k] = "[REDACTED]"
                else:
                    sanitized[k] = v
            log_data["details"] = sanitized

        return json.dumps(log_data)


def setup_logger(name: str = "nyayavault") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


logger = setup_logger()
