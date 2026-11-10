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
 * One fixture for a club team.
 * The result columns stay empty until someone records the score afterwards.
 * The table is named club_matches because MATCH is a reserved SQL word.
 */
@Entity
@Table(name = "club_matches")
@Getter
@Setter
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false)
    private String opponent;

    @Column(name = "kickoff_at", nullable = false)
    private LocalDateTime kickoffAt;

    @Column(nullable = false)
    private String venue;

    @Enumerated(EnumType.STRING)
    @Column(name = "home_away", nullable = false)
    private HomeAway homeAway;

    /** Null until the score is recorded. Both stay null, or both are set. */
    @Column(name = "goals_for")
    private Integer goalsFor;

    @Column(name = "goals_against")
    private Integer goalsAgainst;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    /**
     * When the attendance list was frozen ("Klar" or 8 hours after kickoffAt).
     * Null means the list is still open and follows the team's current players.
     * Nullable so Hibernate can add the column to existing rows (no Flyway).
     */
    @Column(name = "attendance_locked_at")
    private LocalDateTime attendanceLockedAt;
}
