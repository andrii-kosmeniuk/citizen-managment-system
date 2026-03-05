import enum


class RequestStatus(str, enum.Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class RequestPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
