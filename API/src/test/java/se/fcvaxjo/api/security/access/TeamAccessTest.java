package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Team names have no x-pii fields, so every signed-in role may read them.
 * POST /api/teams is ADMIN and CHAIRMAN (x-roles, ADR 0006).
 * Linking a coach is ADMIN and CHAIRMAN too. The chairman cases are in KnownChairmanAccessTest.
 */
class TeamAccessTest extends ClubApiTest {

    @Test
    void admin_canListTeamNames() throws Exception {
        assertSeesBothTeamNames(Actor.ADMIN);
    }

    @Test
    void chairman_canListTeamNames() throws Exception {
        assertSeesBothTeamNames(Actor.CHAIRMAN);
    }

    @Test
    void coach_canListTeamNames() throws Exception {
        assertSeesBothTeamNames(Actor.COACH_ALFA);
    }

    @Test
    void player_canListTeamNames() throws Exception {
        assertSeesBothTeamNames(Actor.PLAYER_ALFA);
    }

    @Test
    void parent_canListTeamNames() throws Exception {
        assertSeesBothTeamNames(Actor.PARENT_ALFA);
    }

    @Test
    void player_canReadOneTeamById() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(ClubFixture.TEAM_ALFA));
    }

    @Test
    void coach_seesCoachPhoneOnOwnTeam() throws Exception {
        // Coach contact details are x-pii. A coach of this team may see the staff on that team.
        get(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.PHONE_COACH_ALFA)));
    }

    @Test
    void admin_canCreateTeam() throws Exception {
        post(Actor.ADMIN, "/api/teams", SampleRequests.team("Lag Gamma"))
                .andExpect(status().isCreated());
    }

    @Test
    void chairman_canCreateTeam() throws Exception {
        // ADR 0006: starting a team is club work, not only the technical admin account.
        post(Actor.CHAIRMAN, "/api/teams", SampleRequests.team("Lag Ordforande"))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_cannotCreateTeam() throws Exception {
        // x-roles today is ADMIN only. ADR 0006 also keeps team creation off COACH.
        post(Actor.COACH_ALFA, "/api/teams", SampleRequests.team("Lag Gamma"))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCreateTeam() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/teams", SampleRequests.team("Lag Gamma"))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateTeam() throws Exception {
        post(Actor.PARENT_ALFA, "/api/teams", SampleRequests.team("Lag Gamma"))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_canAddCoachToTeam() throws Exception {
        post(Actor.ADMIN, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_cannotAddCoach() throws Exception {
        post(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotAddCoach() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotAddCoach() throws Exception {
        post(Actor.PARENT_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_canRemoveCoachFromTeam() throws Exception {
        delete(Actor.ADMIN, "/api/teams/" + world.teamBetaId() + "/coaches/" + world.coachBetaId())
                .andExpect(status().isNoContent());
    }

    @Test
    void coach_cannotRemoveCoach() throws Exception {
        delete(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches/" + world.coachAlfaId())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotRemoveCoach() throws Exception {
        delete(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches/" + world.coachAlfaId())
                .andExpect(status().isForbidden());
    }

    private void assertSeesBothTeamNames(Actor actor) throws Exception {
        // TeamResponse is id + name. No email or phone, so the list is not a personal-data leak.
        get(actor, "/api/teams")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.TEAM_ALFA)))
                .andExpect(content().string(containsString(ClubFixture.TEAM_BETA)));
    }
}
