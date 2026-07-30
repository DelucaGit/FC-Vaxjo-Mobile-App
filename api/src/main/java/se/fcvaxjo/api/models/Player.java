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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

/**
 * A football player at the club.
 *
 * Young players may not have their own login yet.
 * In that case "user" stays null and parents manage the player.
 *
 * Coaches are not stored on the player — they are stored on the Team.
 */
@Entity
@Table(name = "players")
@Getter
@Setter
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Login account for this player, if they have one.
     * Null when only parents manage the profile.
     */
    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    /** Always filled in so we can show the name even without a login. */
    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    /** Date of birth as text for now, e.g. "2014-05-20". */
    private String dateOfBirth;

    /** Shirt number on the team, optional. */
    private Integer jerseyNumber;

    /** The squad this player belongs to. */
    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;

    /**
     * One or more parents/guardians.
     * Many-to-many: one parent can have several children,
     * and one player can have several parents.
     */
    @ManyToMany
    @JoinTable(
            name = "player_parents",
            joinColumns = @JoinColumn(name = "player_id"),
            inverseJoinColumns = @JoinColumn(name = "parent_user_id")
    )
    private List<User> parents = new ArrayList<>();
}
