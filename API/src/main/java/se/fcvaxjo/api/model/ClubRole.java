package se.fcvaxjo.api.model;

/**
 * Who is above whom (ADR 0006). One user has one role.
 *
 * The number is the rank, not the id in the roles table.
 * PLAYER and PARENT share a rank because they are equal.
 * Enum order cannot say "equal", so the rank is written out.
 *
 * ADMIN (4) > CHAIRMAN (3) > COACH (2) > PLAYER (1) = PARENT (1).
 */
public enum ClubRole {

    ADMIN(4),
    CHAIRMAN(3),
    COACH(2),
    PLAYER(1),
    PARENT(1);

    private final int rank;

    ClubRole(int rank) {
        this.rank = rank;
    }

    public int rank() {
        return rank;
    }

    /** Same rank is not above. PLAYER does not outrank PARENT. */
    public boolean outranks(ClubRole other) {
        return rank > other.rank;
    }

    /** A coach, player, or parent does not create teams for the club. */
    public boolean canCreateTeam() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Linking a coach is club work, separate from creating the team (ADR 0006).
     * A coach does not assign coaches, not even on a team they already belong to.
     * The check is written out again so a later change to team creation does not
     * silently change who may link a coach.
     */
    public boolean canLinkCoach() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Trainings for every team, not one team.
     * A coach is left out on purpose. A coach may only manage trainings
     * on teams they are linked to, and that link lives in team_coaches.
     * ClubRole does not know those rows, so the team check stays in TrainingService.
     */
    public boolean canManageAllTrainings() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Matches for every team, not one team.
     * Written out again on purpose. A later change to trainings must not
     * silently change who may record a match. The coach's team check stays
     * in MatchService, because this enum does not know team_coaches.
     */
    public boolean canManageAllMatches() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * A training or match start that has already passed (issue #115).
     * Only ADMIN, so history can be fixed. A chairman or coach would
     * only put mistakes into the schedule and the attendance numbers.
     */
    public boolean canSetPastActivityTime() {
        return this == ADMIN;
    }

    /**
     * People on every team, not only the teams in team_coaches.
     * ADMIN and CHAIRMAN look after the whole club, so the list, the search
     * and a single user are not limited to one team.
     * A coach is left out on purpose. A coach may read people only on teams
     * they are linked to. ClubRole does not know those rows, so the team
     * check stays in UserService, next to the check already used for writes.
     */
    public boolean canReadEveryTeam() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Club-lead roles. A chairman must not hand these out.
     * Only an admin may create or assign ADMIN and CHAIRMAN.
     */
    public boolean isClubLead() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Email and phone of other people.
     * ADMIN and CHAIRMAN may read them for every team ({@link #canReadEveryTeam()}).
     * A coach may read them only for teams they train. That limit is not decided
     * here, because this enum does not know the team_coaches rows.
     * PLAYER and PARENT may not read other people's contact details.
     */
    public boolean canReadPersonalData() {
        return this == ADMIN || this == CHAIRMAN || this == COACH;
    }
}
