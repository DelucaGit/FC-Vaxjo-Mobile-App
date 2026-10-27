package se.fcvaxjo.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * One row = one COACH on one TEAM.
 * Same coach can appear on several teams; same team can have several coaches.
 */
@Entity
@Table(
        name = "team_coaches",
        uniqueConstraints = @UniqueConstraint(columnNames = { "team_id", "user_id" }))
@Getter
@Setter
public class TeamCoach {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "user_id", nullable = false)
    private Long userId;
}
