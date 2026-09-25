from fastapi import HTTPException, status


class NyayaVaultException(HTTPException):
    def __init__(self, status_code: int, detail: str, error_code: str = "INTERNAL_ERROR"):
        super().__init__(status_code=status_code, detail={"message": detail, "code": error_code})


class AuthenticationFailedException(NyayaVaultException):
    def __init__(self, detail: str = "Invalid credentials provided"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTH_FAILED",
        )


class PermissionDeniedException(NyayaVaultException):
    def __init__(self, detail: str = "Access denied: insufficient permissions or case clearance"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="PERMISSION_DENIED",
        )


class ResourceNotFoundException(NyayaVaultException):
    def __init__(self, detail: str = "Requested resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
        )


class IntegrityValidationFailedException(NyayaVaultException):
    def __init__(self, detail: str = "Cryptographic integrity verification failed"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="INTEGRITY_MISMATCH",
        )


class MalwareDetectedException(NyayaVaultException):
    def __init__(self, detail: str = "Security scanner rejected file: potential malicious content detected"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="MALWARE_DETECTED",
        )
