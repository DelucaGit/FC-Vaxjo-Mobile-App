package se.fcvaxjo.api.model;

/**
 * A training stays in the database when it is called off.
 * SCHEDULED is the normal row. CANCELLED keeps the attendance history.
 */
public enum TrainingStatus {
    SCHEDULED,
    CANCELLED
}
