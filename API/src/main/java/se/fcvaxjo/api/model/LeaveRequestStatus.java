package se.fcvaxjo.api.model;

/**
 * A new leave request is PENDING. The coach answers with APPROVED or DENIED (a later issue).
 * Only a PENDING request can be withdrawn.
 */
public enum LeaveRequestStatus {
    PENDING,
    APPROVED,
    DENIED
}
