package se.fcvaxjo.api.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * One training session for a team (start + end).
 * Attendance rows are saved when a player is marked, and for everyone on the list
 * when the attendance list is frozen (issue #86).
 */
@Entity
@Table(name = "trainings")
@Getter
@Setter
public class Training {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private LocalDateTime endsAt;

    /**
     * Old free-text title. The API no longer reads it (issue #118), but the column is
     * NOT NULL, so new rows store the type's Swedish name here.
     */
    @Column(nullable = false)
    private String title;

    /**
     * FOOTBALL or FITNESS. Null on rows saved before issue #118.
     * Nullable so Hibernate can add the column to existing rows (no Flyway).
     */
    @Enumerated(EnumType.STRING)
    @Column
    private TrainingType type;

    /**
     * Where the session is held. Null when nobody has set a place yet.
     * Older rows have no value. Hibernate adds the column (ADR 0002). No Flyway.
     */
    @Column
    private String venue;

    /**
     * Null means SCHEDULED. The column is nullable so existing rows stay valid
     * when Hibernate adds it. A cancelled row is not deleted.
     */
    @Enumerated(EnumType.STRING)
    @Column
    private TrainingStatus status;

    /** Optional note, for example "Pitch closed". Null when the training is not cancelled. */
    @Column(name = "cancel_reason")
    private String cancelReason;

    /**
     * When the attendance list was frozen ("Klar" or 6 hours after endsAt).
     * Null means the list is still open and follows the team's current players.
     * Nullable so Hibernate can add the column to existing rows (no Flyway).
     */
    @Column(name = "attendance_locked_at")
    private LocalDateTime attendanceLockedAt;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    /** A row saved before this column existed is still a normal training. */
    public TrainingStatus statusOrScheduled() {
        return status == null ? TrainingStatus.SCHEDULED : status;
    }

    /** A row saved before the type column existed counts as football training. */
    public TrainingType typeOrFootball() {
        return type == null ? TrainingType.FOOTBALL : type;
    }
}
