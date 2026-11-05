package se.fcvaxjo.api.model;

/**
 * How a player was recorded for one training.
 * Null on the attendance row means the coach has not marked yet.
 */
public enum AttendanceStatus {
    PRESENT,
    ABSENT,
    EXCUSED
}
