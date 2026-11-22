package se.fcvaxjo.api.model;

/**
 * A new leave request is PENDING. Staff answer with APPROVED or DENIED (issue #213).
 * Only a PENDING request can be withdrawn.
 */
public enum LeaveRequestStatus {
    PENDING,
    APPROVED,
    DENIED
}
