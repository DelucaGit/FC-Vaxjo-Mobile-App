package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Without a token the security filter answers 401.
 * POST /api/auth/login is the only public call in the contract today.
 */
class AnonymousAccessTest extends ClubApiTest {

    @Test
    void anonymous_cannotListUsers() throws Exception {
        get(Actor.ANON, "/api/users").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotReadOneUser() throws Exception {
        get(Actor.ANON, "/api/users/" + world.playerAlfaId()).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotSearchUsers() throws Exception {
        get(Actor.ANON, "/api/users/search", "name", "Alfa").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListTeams() throws Exception {
        get(Actor.ANON, "/api/teams").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotReadOneTeam() throws Exception {
        get(Actor.ANON, "/api/teams/" + world.teamAlfaId()).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListCoaches() throws Exception {
        get(Actor.ANON, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListPlayers() throws Exception {
        get(Actor.ANON, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListTrainings() throws Exception {
        get(Actor.ANON, "/api/trainings?teamId=" + world.teamAlfaId())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotReadOneTraining() throws Exception {
        get(Actor.ANON, "/api/trainings/" + world.trainingAlfaId())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListAttendance() throws Exception {
        get(Actor.ANON, "/api/trainings/" + world.trainingAlfaId() + "/attendance")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListOwnTeams() throws Exception {
        get(Actor.ANON, "/api/my/teams").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListChildren() throws Exception {
        get(Actor.ANON, "/api/my/children").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotListOwnTrainings() throws Exception {
        get(Actor.ANON, "/api/my/trainings").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotCallPlannedPublicTeams() throws Exception {
        // /api/public/teams is x-status planned. Until it exists it must not be an open door.
        get(Actor.ANON, "/api/public/teams").andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotChangePassword() throws Exception {
        post(Actor.ANON, "/api/auth/change-password",
                SampleRequests.changeLogin(sharedLogin, rotatedLogin))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotRefresh() throws Exception {
        post(Actor.ANON, "/api/auth/refresh", null).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotCreateUser() throws Exception {
        post(Actor.ANON, "/api/users",
                SampleRequests.newPlayer("anon@example.test", "070-0000-0199", 99,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotCreateTeam() throws Exception {
        post(Actor.ANON, "/api/teams", SampleRequests.team("Lag Anon"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotAddCoach() throws Exception {
        post(Actor.ANON, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymous_cannotCreateTraining() throws Exception {
        post(Actor.ANON, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isUnauthorized());
    }

}
