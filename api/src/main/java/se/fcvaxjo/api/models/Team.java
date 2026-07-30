package se.fcvaxjo.api.models;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

/**
 * A squad at the club, for example "P12" or "Flickor 14".
 * Coaches belong to the team. Players also belong to the team.
 */
@Entity
@Table(name = "teams")
@Getter
@Setter
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name, e.g. "P12 Blå". */
    @Column(nullable = false)
    private String name;

    /**
     * Birth year / age group label, e.g. "2014".
     * Helps the club group players by age.
     */
    private String ageGroup;

    /** Season label, e.g. "2026". */
    private String season;

    /**
     * Coaches who train this team.
     * Many-to-many: one coach can train several teams,
     * and one team can have several coaches.
     */
    @ManyToMany
    @JoinTable(
            name = "team_coaches",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "coach_user_id")
    )
    private List<User> coaches = new ArrayList<>();
}
