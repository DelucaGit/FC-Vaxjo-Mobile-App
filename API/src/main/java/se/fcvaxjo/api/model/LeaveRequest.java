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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * A player's or parent's request to skip one upcoming training or match (issue #210).
 * Exactly one of trainingId and matchId is set. One request per player and activity.
 * reasonType and reasonText are personal data and can be sensitive (illness, injury).
 */
@Entity
@Table(
        name = "leave_requests",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = { "player_user_id", "training_id" }),
                @UniqueConstraint(columnNames = { "player_user_id", "match_id" })
        })
@Getter
@Setter
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_user_id", nullable = false)
    private Long playerUserId;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "training_id")
    private Long trainingId;

    @Column(name = "match_id")
    private Long matchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false)
    private LeaveReasonType reasonType;

    @Column(name = "reason_text")
    private String reasonText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveRequestStatus status;

    @Column(name = "coach_note")
    private String coachNote;

    @Column(name = "decided_by_user_id")
    private Long decidedByUserId;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
