package se.fcvaxjo.api.model;

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
 * One player's attendance row for one match. Same shape as TrainingAttendance.
 * The row is created the first time a staff member marks the player
 * (see MatchService.updateAttendance). Until then an open match shows the player
 * with status null. A frozen match shows exactly these rows (MatchAttendanceRoster).
 */
@Entity
@Table(
        name = "match_attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = { "match_id", "player_user_id" }))
@Getter
@Setter
public class MatchAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "player_user_id", nullable = false)
    private Long playerUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private AttendanceStatus status;
}
