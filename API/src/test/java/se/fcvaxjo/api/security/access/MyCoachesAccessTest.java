package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;

/**
 * GET /api/my/coaches (issue #79, ADR 0009).
 * A player or parent sees name, email and phone of the active coaches on their own team.
 * Same person check as /api/my/trainings. Never another team's coach.
 */
class MyCoachesAccessTest extends ClubApiTest {

    private static final String PATH = "/api/my/coaches";

    @Autowired
    private UserRepository users;

    @Autowired
    private TeamCoachRepository links;

    @Autowired
    private RoleRepository roles;

    @Test
    void player_seesOwnTeamCoachContactOnly() throws Exception {
        get(Actor.PLAYER_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(world.coachAlfaId()))
                .andExpect(jsonPath("$[0].name").value("Test Tranare Alfa"))
                .andExpect(jsonPath("$[0].email").value(ClubFixture.EMAIL_COACH_ALFA))
                .andExpect(jsonPath("$[0].mobilePhoneNumber").value(ClubFixture.PHONE_COACH_ALFA))
                // Only the four contact fields. No role, shirt, parent or team data.
                .andExpect(jsonPath("$[0].roleName").doesNotExist())
                .andExpect(jsonPath("$[0].playerNumber").doesNotExist())
                .andExpect(jsonPath("$[0].parentId").doesNotExist())
                .andExpect(jsonPath("$[0].teamId").doesNotExist())
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_COACH_BETA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_COACH_BETA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))));
    }

    @Test
    void player_cannotAskForAChild() throws Exception {
        get(Actor.PLAYER_ALFA, PATH, "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_seesOwnChildTeamCoachOnly() throws Exception {
        get(Actor.PARENT_ALFA, PATH, "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].email").value(ClubFixture.EMAIL_COACH_ALFA))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_COACH_BETA))));
    }

    @Test
    void otherParent_seesTheirChildTeamCoach() throws Exception {
        get(Actor.PARENT_BETA, PATH, "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].email").value(ClubFixture.EMAIL_COACH_BETA))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_COACH_ALFA))));
    }

    @Test
    void parent_cannotUseAnotherChild() throws Exception {
        get(Actor.PARENT_ALFA, PATH, "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_unknownChildIsNotFound() throws Exception {
        get(Actor.PARENT_ALFA, PATH, "childId", "999999")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player not found"));
    }

    @Test
    void parent_mustSendChildId() throws Exception {
        get(Actor.PARENT_ALFA, PATH).andExpect(status().isBadRequest());
    }

    @Test
    void inactiveCoach_isLeftOut() throws Exception {
        AppUser inactiveCoach = new AppUser();
        inactiveCoach.setName("Test Tranare Inaktiv");
        inactiveCoach.setEmail("tranare.inaktiv@example.test");
        inactiveCoach.setMobilePhoneNumber("070-0000-0199");
        inactiveCoach.setRoleId(roles.findByName("COACH").orElseThrow().getId());
        inactiveCoach.setActive(false);
        inactiveCoach.setPasswordHash("not-used");
        inactiveCoach = users.save(inactiveCoach);

        TeamCoach link = new TeamCoach();
        link.setTeamId(world.teamAlfaId());
        link.setUserId(inactiveCoach.getId());
        links.save(link);

        get(Actor.PLAYER_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(content().string(not(containsString("tranare.inaktiv@example.test"))))
                .andExpect(content().string(not(containsString("070-0000-0199"))));
    }

    @Test
    void coach_cannotOpenMyCoaches() throws Exception {
        // Staff already have GET /api/teams/{id}/coaches. /api/my/coaches is the family view.
        get(Actor.COACH_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotOpenMyCoaches() throws Exception {
        get(Actor.ADMIN, PATH).andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotOpenMyCoaches() throws Exception {
        get(Actor.CHAIRMAN, PATH).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_isTurnedAway() throws Exception {
        get(Actor.ANON, PATH).andExpect(status().isUnauthorized());
    }

    @Test
    void teamCoachList_staysClosedForPlayerAndParent() throws Exception {
        // The new endpoint does not open the staff list. Any team id there stays 403.
        get(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
        get(Actor.PARENT_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
    }
}
