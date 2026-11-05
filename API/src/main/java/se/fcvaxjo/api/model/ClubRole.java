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
}
