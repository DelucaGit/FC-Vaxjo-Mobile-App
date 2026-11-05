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
     * Club-lead roles. A chairman must not hand these out.
     * Only an admin may create or assign ADMIN and CHAIRMAN.
     */
    public boolean isClubLead() {
        return this == ADMIN || this == CHAIRMAN;
    }

    /**
     * Email and phone of other people.
     * The chairman looks after the whole club, so this is not limited to one team.
     * A coach is allowed here too. Limiting a coach to their own teams is a later change.
     */
    public boolean canReadPersonalData() {
        return this == ADMIN || this == CHAIRMAN || this == COACH;
    }
}
