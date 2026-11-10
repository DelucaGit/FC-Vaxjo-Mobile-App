package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.UpdateAttendanceRequest;
import se.fcvaxjo.api.service.MatchService;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Match attendance follows the training attendance rules (issue #67).
 * ADMIN and CHAIRMAN every team, COACH only team_coaches, PLAYER and PARENT 403.
 * A coach gets the same 403 for a missing match and for another team's match.
 * A player who is not on the match's team is 400.
 */
class MatchAttendanceAccessTest extends ClubApiTest {

    private static final long UNKNOWN_ID = 9_000_000L;

    // ---- list ----

    @Test
    void coach_listsOwnTeamWithoutContactDetails() throws Exception {
        // Two active Alfa players (Alfa + Extra). The inactive one is not listed.
        get(Actor.COACH_ALFA, attendance(world.matchAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].status").value(nullValue()))
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_BETA))))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))));
    }

    @Test
    void admin_canListAnyTeam() throws Exception {
        get(Actor.ADMIN, attendance(world.matchBetaId()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_BETA)));
    }

    @Test
    void chairman_canListAnyTeam() throws Exception {
        get(Actor.CHAIRMAN, attendance(world.matchAlfaId())).andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotList() throws Exception {
        get(Actor.COACH_BETA, attendance(world.matchAlfaId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void coach_unknownMatch_isForbiddenNotNotFound() throws Exception {
        get(Actor.COACH_ALFA, attendance(UNKNOWN_ID))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void admin_unknownMatch_isNotFound() throws Exception {
        get(Actor.ADMIN, attendance(UNKNOWN_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Match not found"));
    }

    @Test
    void player_cannotList() throws Exception {
        get(Actor.PLAYER_ALFA, attendance(world.matchAlfaId())).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotList() throws Exception {
        get(Actor.PARENT_ALFA, attendance(world.matchAlfaId())).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotList() throws Exception {
        get(Actor.ANON, attendance(world.matchAlfaId())).andExpect(status().isUnauthorized());
    }

    // ---- mark ----

    @Test
    void coach_marksOwnTeamPlayer_andTheListShowsIt() throws Exception {
        put(Actor.COACH_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerUserId").value(world.playerAlfaId()))
                .andExpect(jsonPath("$.status").value("PRESENT"))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PLAYER_ALFA))));

        get(Actor.COACH_ALFA, attendance(world.matchAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(content().string(containsString("PRESENT")));
    }

    @Test
    void marking_twice_updatesTheSameRow() throws Exception {
        put(Actor.COACH_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isOk());
        put(Actor.COACH_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), statusBody("absent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ABSENT"));

        get(Actor.COACH_ALFA, attendance(world.matchAlfaId()))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(content().string(not(containsString("PRESENT"))));
    }

    @Test
    void admin_canMarkAnyTeam() throws Exception {
        put(Actor.ADMIN, mark(world.matchBetaId(), world.playerBetaId()), SampleRequests.present())
                .andExpect(status().isOk());
    }

    @Test
    void chairman_canMark() throws Exception {
        put(Actor.CHAIRMAN, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotMark() throws Exception {
        put(Actor.COACH_BETA, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void coach_cannotMarkOwnPlayerOnOtherTeamsMatch() throws Exception {
        // Team check runs before the player check, so this is 403 and not 400.
        put(Actor.COACH_ALFA, mark(world.matchBetaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_playerFromOtherTeam_isBadRequest() throws Exception {
        put(Actor.COACH_ALFA, mark(world.matchAlfaId(), world.playerBetaId()), SampleRequests.present())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This player is not on the team for this match"));
    }

    @Test
    void admin_playerFromOtherTeam_isBadRequest() throws Exception {
        put(Actor.ADMIN, mark(world.matchAlfaId(), world.playerBetaId()), SampleRequests.present())
                .andExpect(status().isBadRequest());
    }

    @Test
    void inactivePlayer_isBadRequest() throws Exception {
        put(Actor.ADMIN, mark(world.matchAlfaId(), world.inactivePlayerId()), SampleRequests.present())
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonPlayerUser_isBadRequest() throws Exception {
        // A coach id is not a player, so it is not on the roster.
        put(Actor.ADMIN, mark(world.matchAlfaId(), world.coachAlfaId()), SampleRequests.present())
                .andExpect(status().isBadRequest());
    }

    @Test
    void badStatus_isBadRequest() throws Exception {
        put(Actor.COACH_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), statusBody("MAYBE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void coach_unknownMatch_markIsForbidden() throws Exception {
        put(Actor.COACH_ALFA, mark(UNKNOWN_ID, world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_unknownMatch_markIsNotFound() throws Exception {
        put(Actor.ADMIN, mark(UNKNOWN_ID, world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Match not found"));
    }

    @Test
    void player_cannotMark() throws Exception {
        put(Actor.PLAYER_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotMark() throws Exception {
        put(Actor.PARENT_ALFA, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotMark() throws Exception {
        put(Actor.ANON, mark(world.matchAlfaId(), world.playerAlfaId()), SampleRequests.present())
                .andExpect(status().isUnauthorized());
    }

    private String attendance(long matchId) {
        return "/api/matches/" + matchId + "/attendance";
    }

    private String mark(long matchId, long playerId) {
        return attendance(matchId) + "/" + playerId;
    }

    private UpdateAttendanceRequest statusBody(String value) {
        UpdateAttendanceRequest request = new UpdateAttendanceRequest();
        request.setStatus(value);
        return request;
    }
}
