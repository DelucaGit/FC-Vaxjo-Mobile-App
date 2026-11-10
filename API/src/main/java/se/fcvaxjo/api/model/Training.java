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
 * One training session for a team (start + end). Attendance rows are snapshotted on create.
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

    @Column(nullable = false)
    private String title;

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

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    /** A row saved before this column existed is still a normal training. */
    public TrainingStatus statusOrScheduled() {
        return status == null ? TrainingStatus.SCHEDULED : status;
    }
}
