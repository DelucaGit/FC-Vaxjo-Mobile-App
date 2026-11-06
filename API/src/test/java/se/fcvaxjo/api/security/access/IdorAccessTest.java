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
 * Swapping an id in the URL or query.
 * x-scope says a coach stays on their own team, and a parent stays on their own child.
 * The two coach reads that used to return another team's phone are 403 after S1-10.
 * They run in the normal suite. The known-gap tag is gone from those two only.
 */
class IdorAccessTest extends ClubApiTest {

    private static final long UNKNOWN_ID = 9_000_000L;

    @Test
    void player_swapsToAnotherUserId_isForbidden() throws Exception {
        // A player may read only their own id. 403, not 404, so the answer does not say the other id exists.
        get(Actor.PLAYER_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_swapsToAnUnknownUserId_doesNotSayIfItExists() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/users/" + UNKNOWN_ID)
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_swapsChildIdToAnotherChild_isForbidden() throws Exception {
        // x-scope: a parent only sees a child linked to them.
        get(Actor.PARENT_ALFA, "/api/my/trainings", "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_swapsChildIdToAnUnknownId_isNotFound() throws Exception {
        // The contract lists 404 "Player not found" when the id is missing, and 403 when the child is someone else's.
        get(Actor.PARENT_ALFA, "/api/my/trainings", "childId", String.valueOf(UNKNOWN_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void coach_swapsTeamIdOnTrainings_isForbidden() throws Exception {
        get(Actor.COACH_BETA, "/api/trainings?teamId=" + world.teamAlfaId())
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_swapsToAnUnknownTeamId_isForbiddenNotNotFound() throws Exception {
        // Permission is checked before the team lookup, so a stranger cannot scan for real team ids.
        get(Actor.COACH_BETA, "/api/trainings?teamId=" + UNKNOWN_ID)
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_swapsToAnotherTrainingId_isForbidden() throws Exception {
        get(Actor.COACH_BETA, "/api/trainings/" + world.trainingAlfaId())
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_swapsToAnUnknownTrainingId_isNotFound() throws Exception {
        // The contract says 404 when the training id does not exist, for every caller.
        get(Actor.COACH_BETA, "/api/trainings/" + UNKNOWN_ID)
                .andExpect(status().isNotFound());
    }

    @Test
    void coach_cannotMarkAttendanceOnAnotherTeamsTraining() throws Exception {
        put(Actor.COACH_BETA,
                "/api/trainings/" + world.trainingAlfaId() + "/attendance/" + world.playerAlfaId(),
                SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotOpenAnotherTeamsTrainingById() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/trainings/" + world.trainingAlfaId())
                .andExpect(status().isForbidden());
    }

    @Test
    void chairman_canOpenATrainingOnEitherTeam() throws Exception {
        // A chairman looks after every team. This id is not "someone else's".
        get(Actor.CHAIRMAN, "/api/trainings/" + world.trainingAlfaId())
                .andExpect(status().isOk());
    }

    @Test
    void coach_cannotRemoveAPlayerByIdOnAnotherTeam() throws Exception {
        delete(Actor.COACH_BETA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F8: tränare som ändrar ett id som inte finns ska få 403")
    void coach_cannotUpdateAMissingPlayer() throws Exception {
        // 404 would tell the coach the id is free. Another team is already 403.
        var response = put(Actor.COACH_ALFA, "/api/users/" + UNKNOWN_ID + "/player",
                SampleRequests.keepPlayer("Test Saknad", "saknad@example.test", "070-0000-8888", 77,
                        world.teamAlfaId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Only ADMIN, CHAIRMAN, or a coach of this team can manage its players"));
        assertBodyHides(response, ClubFixture.EMAIL_PLAYER_BETA, ClubFixture.PHONE_PLAYER_BETA);
    }

    @Test
    @DisplayName("F8: tränare som tar bort ett id som inte finns ska få 403")
    void coach_cannotDeleteAMissingPlayer() throws Exception {
        delete(Actor.COACH_ALFA, "/api/users/" + UNKNOWN_ID)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Only ADMIN, CHAIRMAN, or a coach of this team can manage its players"));
    }

    @Test
    @DisplayName("F8: admin ska fortfarande få 404 när id saknas")
    void admin_missingPlayerOnDelete_isNotFound() throws Exception {
        delete(Actor.ADMIN, "/api/users/" + UNKNOWN_ID)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    @Test
    @DisplayName("S1-3: tränare som byter lag-id ska inte se förälderns telefon")
    void coach_swapsTeamIdOnThePlayerList_cannotSeeTheParentPhone() throws Exception {
        // S1-10: the service checks team_coaches before it loads the roster.
        // 403, and the other parent's phone is not in the body.
        var response = get(Actor.COACH_BETA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isForbidden());
        assertBodyHides(response, ClubFixture.PHONE_PARENT_ALFA);
    }

    @Test
    @DisplayName("S1-3: tränare som byter user-id ska inte se det andra lagets telefon")
    void coach_swapsUserId_cannotReadTheOtherTeamsPlayer() throws Exception {
        // Same team_coaches check as the roster. Another team's player is 403.
        var response = get(Actor.COACH_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
        assertBodyHides(response, ClubFixture.PHONE_PLAYER_BETA);
    }
}
