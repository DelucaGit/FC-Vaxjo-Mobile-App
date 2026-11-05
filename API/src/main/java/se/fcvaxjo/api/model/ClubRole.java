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
     * Trainings for every team, not one team.
     * A coach is left out on purpose. A coach may only manage trainings
     * on teams they are linked to, and that link lives in team_coaches.
     * ClubRole does not know those rows, so the team check stays in TrainingService.
     */
    public boolean canManageAllTrainings() {
        return this == ADMIN || this == CHAIRMAN;
    }
}
