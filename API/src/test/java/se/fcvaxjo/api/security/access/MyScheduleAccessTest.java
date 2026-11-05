package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;

/**
 * /api/my is the narrow view. PLAYER sees only themselves. PARENT sees only a linked child.
 * MyChildResponse and MyTrainingResponse do not carry email or phone.
 */
class MyScheduleAccessTest extends ClubApiTest {

    @Test
    void admin_seesEveryTeamOnMyTeams() throws Exception {
        // x-roles for GET /api/my/teams is COACH and ADMIN. ADMIN is not limited to team_coaches.
        get(Actor.ADMIN, "/api/my/teams")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.TEAM_ALFA)))
                .andExpect(content().string(containsString(ClubFixture.TEAM_BETA)));
    }

    @Test
    void coach_seesOnlyOwnTeamOnMyTeams() throws Exception {
        get(Actor.COACH_ALFA, "/api/my/teams")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.TEAM_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.TEAM_BETA))));
    }

    @Test
    void otherCoach_seesOnlyTheirOwnTeamOnMyTeams() throws Exception {
        get(Actor.COACH_BETA, "/api/my/teams")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.TEAM_BETA)))
                .andExpect(content().string(not(containsString(ClubFixture.TEAM_ALFA))));
    }

    @Test
    void chairman_cannotListMyTeams() throws Exception {
        get(Actor.CHAIRMAN, "/api/my/teams").andExpect(status().isForbidden());
    }

    @Test
    void player_cannotListMyTeams() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/teams").andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotListMyTeams() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/teams").andExpect(status().isForbidden());
    }

    @Test
    void parent_seesOwnChildNameButNoContactFields() throws Exception {
        // x-roles: PARENT. The child name is x-pii and this parent may see it. Email and phone must stay out.
        get(Actor.PARENT_ALFA, "/api/my/children")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_BETA))))
                .andExpect(content().string(not(containsString("@"))))
                .andExpect(content().string(not(containsString("070-"))));
    }

    @Test
    void otherParent_seesOnlyTheirOwnChild() throws Exception {
        get(Actor.PARENT_BETA, "/api/my/children")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_BETA)))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_ALFA))));
    }

    @Test
    void player_cannotListChildren() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/children").andExpect(status().isForbidden());
    }

    @Test
    void coach_cannotListChildren() throws Exception {
        get(Actor.COACH_ALFA, "/api/my/children").andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotListChildren() throws Exception {
        get(Actor.ADMIN, "/api/my/children").andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotListChildren() throws Exception {
        // x-roles is PARENT only.
        get(Actor.CHAIRMAN, "/api/my/children").andExpect(status().isForbidden());
    }

    @Test
    void player_seesOwnScheduleWithoutParentContact() throws Exception {
        // x-scope: PLAYER only themselves. Parent phone belongs to another person.
        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PARENT_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_BETA))));
    }

    @Test
    void player_cannotAskForAnotherChild() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/trainings", "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_seesOwnChildScheduleWithoutEmail() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/trainings", "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)))
                .andExpect(content().string(not(containsString("@"))));
    }

    @Test
    void parent_cannotSeeAnotherChildSchedule() throws Exception {
        // x-scope: PARENT only a child linked to them.
        get(Actor.PARENT_ALFA, "/api/my/trainings", "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void otherParent_cannotSeeThisChildSchedule() throws Exception {
        get(Actor.PARENT_BETA, "/api/my/trainings", "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_mustSendChildId() throws Exception {
        // The contract says 400 when a parent with children omits childId.
        get(Actor.PARENT_ALFA, "/api/my/trainings").andExpect(status().isBadRequest());
    }

    @Test
    void coach_cannotOpenMyTrainings() throws Exception {
        get(Actor.COACH_ALFA, "/api/my/trainings").andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotOpenMyTrainings() throws Exception {
        get(Actor.ADMIN, "/api/my/trainings").andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotOpenMyTrainings() throws Exception {
        get(Actor.CHAIRMAN, "/api/my/trainings").andExpect(status().isForbidden());
    }
}
