package se.fcvaxjo.api.model;

/**
 * A match stays in the database when it is called off (issue #133).
 * SCHEDULED is the normal row. CANCELLED keeps the attendance and the history.
 * Same values as TrainingStatus, so the app can treat both the same way.
 */
public enum MatchStatus {
    SCHEDULED,
    CANCELLED
}
