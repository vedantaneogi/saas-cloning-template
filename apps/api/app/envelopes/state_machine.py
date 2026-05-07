from fastapi import HTTPException, status

from app.envelopes.models import EnvelopeStatus

# Valid transitions: from_status -> set of allowed to_statuses
# NOTE: Draft envelopes cannot be voided — they must be deleted instead.
# Only sent or delivered envelopes can be voided (in-flight cancellation).
_TRANSITIONS: dict[EnvelopeStatus, set[EnvelopeStatus]] = {
    EnvelopeStatus.draft: {EnvelopeStatus.sent},
    EnvelopeStatus.sent: {
        EnvelopeStatus.delivered,
        EnvelopeStatus.completed,
        EnvelopeStatus.declined,
        EnvelopeStatus.voided,
        # "Correct in-flight" — revert to draft for editing
        EnvelopeStatus.draft,
    },
    EnvelopeStatus.delivered: {
        EnvelopeStatus.completed,
        EnvelopeStatus.declined,
        EnvelopeStatus.voided,
        # "Correct in-flight" — revert to draft for editing
        EnvelopeStatus.draft,
    },
    EnvelopeStatus.completed: set(),
    EnvelopeStatus.declined: set(),
    EnvelopeStatus.voided: set(),
}


def validate_transition(current: EnvelopeStatus, target: EnvelopeStatus) -> None:
    """Raise HTTP 409 if the status transition is not allowed."""
    allowed = _TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot transition envelope from '{current.value}' to '{target.value}'. "
                f"Allowed: {[s.value for s in allowed] or 'none'}"
            ),
        )
