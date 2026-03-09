import enum


class RequestStatus(str, enum.Enum):
    NEW = "NEW"
    IN_PROGRESS = "IN_PROGRESS"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class RequestPriority(str, enum.Enum):
    NIEDRIG = "NIEDRIG"
    MITTEL = "MITTEL"
    HOCH = "HOCH"
    KRITISCH = "KRITISCH"
