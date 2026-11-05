package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Story S1-3: a coach may change users only on a team they train.
 * These checks now pass, so they run with the normal suite.
 */
class KnownCoachScopeTest extends ClubApiTest {

    @Test
    @DisplayName("S1-3: tränare ska inte skapa spelare i ett annat lag")
    void coachFromOtherTeam_cannotCreatePlayer() throws Exception {
        // x-scope-planned: COACH may create a player only on a team they coach.
        post(Actor.COACH_ALFA, "/api/users",
                SampleRequests.newPlayer("ny.beta@example.test", "070-0000-0282", 82,
                        world.parentBetaId(), world.teamBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-3: tränare ska inte ändra en spelare i ett annat lag")
    void coachFromOtherTeam_cannotUpdatePlayer() throws Exception {
        put(Actor.COACH_ALFA, "/api/users/" + world.playerBetaId() + "/player",
                SampleRequests.keepPlayer(
                        ClubFixture.NAME_PLAYER_BETA,
                        ClubFixture.EMAIL_PLAYER_BETA,
                        ClubFixture.PHONE_PLAYER_BETA,
                        ClubFixture.SHIRT_BETA,
                        world.teamBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-3: tränare ska inte ta bort en spelare i ett annat lag")
    void coachFromOtherTeam_cannotRemovePlayer() throws Exception {
        // extra player is on Lag Alfa. The Beta coach must not soft-delete them.
        delete(Actor.COACH_BETA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isForbidden());
    }
}
