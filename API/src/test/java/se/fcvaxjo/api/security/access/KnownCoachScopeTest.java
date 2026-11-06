package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

    @Test
    @DisplayName("F7: tränare ska inte få veta att e-posten finns i ett annat lag")
    void coach_duplicateEmailOutsideTheTeam_usesAGenericMessage() throws Exception {
        var response = post(Actor.COACH_ALFA, "/api/users",
                SampleRequests.newPlayer(ClubFixture.EMAIL_PLAYER_BETA, "070-0000-0281", 81,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Could not create the user"));
        assertBodyHides(response, "User already exists", "Phone number already in use",
                ClubFixture.NAME_PLAYER_BETA);
    }

    @Test
    @DisplayName("F7: tränare ska inte få veta att telefonen finns i ett annat lag")
    void coach_duplicatePhoneOutsideTheTeam_usesAGenericMessage() throws Exception {
        var response = post(Actor.COACH_ALFA, "/api/users",
                SampleRequests.newPlayer("ny.telefon@example.test", ClubFixture.PHONE_PLAYER_BETA, 82,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Could not create the user"));
        assertBodyHides(response, "User already exists", "Phone number already in use",
                ClubFixture.NAME_PLAYER_BETA);
    }

    @Test
    @DisplayName("F7: samma text när dubbletten ligger i tränarens eget lag")
    void coach_duplicateOnOwnTeam_usesTheSameGenericMessage() throws Exception {
        // A different sentence for "own team" would still show that the other answer means "outside".
        post(Actor.COACH_ALFA, "/api/users",
                SampleRequests.newPlayer(ClubFixture.EMAIL_PLAYER_ALFA, "070-0000-0283", 83,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Could not create the user"));
    }

    @Test
    @DisplayName("F7: admin får fortfarande den exakta dubbletttexten")
    void admin_duplicateEmail_keepsTheExactMessage() throws Exception {
        post(Actor.ADMIN, "/api/users",
                SampleRequests.newPlayer(ClubFixture.EMAIL_PLAYER_BETA, "070-0000-0284", 84,
                        world.parentBetaId(), world.teamBetaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User already exists"));
    }
}
