package se.fcvaxjo.api.support;

/**
 * Ids and JWTs for one fictional club loaded by {@link ClubFixture}.
 * Tokens are test tokens only. They are not secrets to reuse outside the test.
 */
public record ClubWorld(
        long teamAlfaId,
        long teamBetaId,
        long adminId,
        long chairmanId,
        long coachAlfaId,
        long coachBetaId,
        long playerAlfaId,
        long playerBetaId,
        long extraPlayerId,
        long inactivePlayerId,
        long parentAlfaId,
        long parentBetaId,
        long trainingAlfaId,
        String adminToken,
        String chairmanToken,
        String coachAlfaToken,
        String coachBetaToken,
        String playerAlfaToken,
        String parentAlfaToken,
        String parentBetaToken,
        String inactivePlayerToken) {
}
