package se.fcvaxjo.api.models;

import java.util.ArrayList;
import java.util.List;

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
@Getter
@Setter
public class Player {
    private String id;

    /**
     * Login account for this player, if they have one.
     * Null when only parents manage the profile.
     */
    private User user;

    /** Always filled in so we can show the name even without a login. */
    private String firstName;
    private String lastName;

    /** Date of birth as text for now, e.g. "2014-05-20". We can use a real date type later. */
    private String dateOfBirth;

    /** Shirt number on the team, optional. */
    private Integer jerseyNumber;

    /** The squad this player belongs to. */
    private Team team;

    /** One or more parents/guardians. */
    private List<User> parents = new ArrayList<>();
}
