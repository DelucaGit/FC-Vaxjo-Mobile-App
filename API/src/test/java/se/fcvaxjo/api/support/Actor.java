package se.fcvaxjo.api.support;

/**
 * Who is calling the API in a role-matrix test.
 * COACH_ALFA is linked to Lag Alfa. COACH_BETA is linked to Lag Beta.
 * PARENT_ALFA is the parent of the Alfa player. PARENT_BETA is the parent of the Beta player.
 */
public enum Actor {
    ANON,
    ADMIN,
    CHAIRMAN,
    COACH_ALFA,
    COACH_BETA,
    PLAYER_ALFA,
    PARENT_ALFA,
    PARENT_BETA,
    INACTIVE_PLAYER
}
