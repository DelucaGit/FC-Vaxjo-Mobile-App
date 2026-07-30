package se.fcvaxjo.api.models;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * A squad at the club, for example "P12" or "Flickor 14".
 * Coaches belong to the team. Players also belong to the team.
 */
@Getter
@Setter
public class Team {
    private String id;

    /** Display name, e.g. "P12 Blå". */
    private String name;

    /**
     * Birth year / age group label, e.g. "2014".
     * Helps the club group players by age.
     */
    private String ageGroup;

    /** Season label, e.g. "2026". */
    private String season;

    /** Coaches who train this team. */
    private List<User> coaches = new ArrayList<>();
}
