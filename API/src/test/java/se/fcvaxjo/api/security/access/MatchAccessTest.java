package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.UpdateMatchRequest;
import se.fcvaxjo.api.service.MatchService;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Matches follow the training rules.
 * ADMIN and CHAIRMAN write every team. A coach writes only team_coaches.
 * PLAYER and PARENT read their own team through /api/my/matches.
 * A coach gets the same 403 for a missing match and for another team's match.
 */
class MatchAccessTest extends ClubApiTest {

    private static final long UNKNOWN_ID = 9_000_000L;

    @Test
    void admin_canListMatchesForAnyTeam() throws Exception {
        get(Actor.ADMIN, alfaMatches())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))));
    }

    @Test
    void chairman_canListMatchesForAnyTeam() throws Exception {
        get(Actor.CHAIRMAN, alfaMatches()).andExpect(status().isOk());
    }

    @Test
    void coach_canListMatchesForOwnTeam() throws Exception {
        get(Actor.COACH_ALFA, alfaMatches())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.OPPONENT_BETA))));
    }

    @Test
    void coachFromOtherTeam_cannotListMatches() throws Exception {
        get(Actor.COACH_BETA, alfaMatches())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void coach_unknownTeam_isForbiddenNotNotFound() throws Exception {
        get(Actor.COACH_ALFA, "/api/matches?teamId=" + UNKNOWN_ID)
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotListStaffMatches() throws Exception {
        get(Actor.PLAYER_ALFA, alfaMatches()).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotListStaffMatches() throws Exception {
        get(Actor.PARENT_ALFA, alfaMatches()).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotListMatches() throws Exception {
        get(Actor.ANON, alfaMatches()).andExpect(status().isUnauthorized());
    }

    @Test
    void admin_canReadOneMatch() throws Exception {
        get(Actor.ADMIN, oneAlfaMatch())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opponent").value(ClubFixture.OPPONENT_ALFA))
                .andExpect(jsonPath("$.result").value(nullValue()));
    }

    @Test
    void chairman_canReadOneMatch() throws Exception {
        get(Actor.CHAIRMAN, oneAlfaMatch()).andExpect(status().isOk());
    }

    @Test
    void coach_canReadOwnTeamMatch() throws Exception {
        get(Actor.COACH_ALFA, oneAlfaMatch()).andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotReadMatch() throws Exception {
        get(Actor.COACH_BETA, oneAlfaMatch())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void coach_missingMatch_usesTheSameForbiddenAnswer() throws Exception {
        // 404 would tell the coach the id is free. Another team is already 403.
        get(Actor.COACH_ALFA, "/api/matches/" + UNKNOWN_ID)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void admin_missingMatch_isNotFound() throws Exception {
        get(Actor.ADMIN, "/api/matches/" + UNKNOWN_ID)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Match not found"));
    }

    @Test
    void chairman_missingMatch_isNotFound() throws Exception {
        get(Actor.CHAIRMAN, "/api/matches/" + UNKNOWN_ID)
                .andExpect(status().isNotFound());
    }

    @Test
    void player_cannotReadStaffMatch() throws Exception {
        get(Actor.PLAYER_ALFA, oneAlfaMatch()).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotReadStaffMatch() throws Exception {
        get(Actor.PARENT_BETA, oneAlfaMatch()).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotReadMatch() throws Exception {
        get(Actor.ANON, oneAlfaMatch()).andExpect(status().isUnauthorized());
    }

    @Test
    void admin_canCreateMatch() throws Exception {
        post(Actor.ADMIN, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.opponent").value("Extra motstandare"))
                .andExpect(jsonPath("$.result").value(nullValue()));
    }

    @Test
    void chairman_canCreateMatch() throws Exception {
        post(Actor.CHAIRMAN, "/api/matches", SampleRequests.match(world.teamBetaId()))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_canCreateMatchForOwnTeam() throws Exception {
        post(Actor.COACH_ALFA, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isCreated());
    }

    @Test
    void coachFromOtherTeam_cannotCreateMatch() throws Exception {
        post(Actor.COACH_BETA, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCreateMatch() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateMatch() throws Exception {
        post(Actor.PARENT_ALFA, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotCreateMatch() throws Exception {
        post(Actor.ANON, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isUnauthorized());
    }

    // ---- edit a match (issue #127) ----

    @Test
    void admin_canEditMatch() throws Exception {
        put(Actor.ADMIN, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opponent").value("Flyttad motstandare"))
                .andExpect(jsonPath("$.kickoffAt").value(containsString("2026-12-21T15:00")))
                .andExpect(jsonPath("$.venue").value("Ny plan"))
                .andExpect(jsonPath("$.homeAway").value("AWAY"))
                .andExpect(jsonPath("$.teamId").value(world.teamAlfaId()));
    }

    @Test
    void chairman_canEditMatch() throws Exception {
        put(Actor.CHAIRMAN, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isOk());
    }

    @Test
    void coach_canEditOwnTeamMatch() throws Exception {
        put(Actor.COACH_ALFA, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opponent").value("Flyttad motstandare"));
        get(Actor.COACH_ALFA, oneAlfaMatch())
                .andExpect(jsonPath("$.venue").value("Ny plan"));
    }

    @Test
    void coachFromOtherTeam_cannotEditMatch() throws Exception {
        put(Actor.COACH_BETA, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
        get(Actor.COACH_ALFA, oneAlfaMatch())
                .andExpect(jsonPath("$.opponent").value(ClubFixture.OPPONENT_ALFA));
    }

    @Test
    void coach_editMissingMatch_usesTheSameForbiddenAnswer() throws Exception {
        put(Actor.COACH_ALFA, "/api/matches/" + UNKNOWN_ID, SampleRequests.matchChange())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void admin_editMissingMatch_isNotFound() throws Exception {
        put(Actor.ADMIN, "/api/matches/" + UNKNOWN_ID, SampleRequests.matchChange())
                .andExpect(status().isNotFound());
    }

    @Test
    void player_cannotEditMatch() throws Exception {
        put(Actor.PLAYER_ALFA, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotEditMatch() throws Exception {
        put(Actor.PARENT_ALFA, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotEditMatch() throws Exception {
        put(Actor.ANON, oneAlfaMatch(), SampleRequests.matchChange())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void coach_cannotMoveMatchIntoThePast() throws Exception {
        put(Actor.COACH_ALFA, oneAlfaMatch(), matchMovedToYesterday())
                .andExpect(status().isBadRequest());
        get(Actor.COACH_ALFA, oneAlfaMatch())
                .andExpect(jsonPath("$.opponent").value(ClubFixture.OPPONENT_ALFA));
    }

    @Test
    void chairman_cannotMoveMatchIntoThePast() throws Exception {
        put(Actor.CHAIRMAN, oneAlfaMatch(), matchMovedToYesterday())
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_canMoveMatchIntoThePast() throws Exception {
        put(Actor.ADMIN, oneAlfaMatch(), matchMovedToYesterday())
                .andExpect(status().isOk());
    }

    @Test
    void coach_canRecordResultOnOwnTeam() throws Exception {
        put(Actor.COACH_ALFA, resultAlfa(), SampleRequests.result(3, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.goalsFor").value(3))
                .andExpect(jsonPath("$.result.goalsAgainst").value(1));
    }

    @Test
    void admin_canRecordResult() throws Exception {
        put(Actor.ADMIN, resultAlfa(), SampleRequests.result(2, 2))
                .andExpect(status().isOk());
    }

    @Test
    void chairman_canRecordResult() throws Exception {
        put(Actor.CHAIRMAN, resultAlfa(), SampleRequests.result(1, 0))
                .andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotRecordResult() throws Exception {
        put(Actor.COACH_BETA, resultAlfa(), SampleRequests.result(4, 0))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void coach_missingMatchResult_usesTheSameForbiddenAnswer() throws Exception {
        put(Actor.COACH_ALFA, "/api/matches/" + UNKNOWN_ID + "/result", SampleRequests.result(1, 0))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
    }

    @Test
    void player_cannotRecordResult() throws Exception {
        put(Actor.PLAYER_ALFA, resultAlfa(), SampleRequests.result(1, 0))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotRecordResult() throws Exception {
        put(Actor.PARENT_ALFA, resultAlfa(), SampleRequests.result(1, 0))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotRecordResult() throws Exception {
        put(Actor.ANON, resultAlfa(), SampleRequests.result(1, 0))
                .andExpect(status().isUnauthorized());
    }

    // Clearing: the Beta match already has 1-0 in ClubFixture.
    // Both goals null removes the score. Same roles and teams as setting it.

    @Test
    void coach_canClearResultOnOwnTeam() throws Exception {
        put(Actor.COACH_BETA, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(nullValue()));
        get(Actor.COACH_BETA, oneBetaMatch())
                .andExpect(jsonPath("$.result").value(nullValue()));
    }

    @Test
    void admin_canClearResult() throws Exception {
        put(Actor.ADMIN, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(nullValue()));
    }

    @Test
    void chairman_canClearResult() throws Exception {
        put(Actor.CHAIRMAN, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(nullValue()));
    }

    @Test
    void coachFromOtherTeam_cannotClearResult() throws Exception {
        put(Actor.COACH_ALFA, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(MatchService.MANAGE_DENIED));
        get(Actor.COACH_BETA, oneBetaMatch())
                .andExpect(jsonPath("$.result.goalsFor").value(1));
    }

    @Test
    void player_cannotClearResult() throws Exception {
        put(Actor.PLAYER_ALFA, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotClearResult() throws Exception {
        put(Actor.PARENT_BETA, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotClearResult() throws Exception {
        put(Actor.ANON, resultBeta(), SampleRequests.result(null, null))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void onlyGoalsFor_isBadRequest() throws Exception {
        put(Actor.COACH_BETA, resultBeta(), SampleRequests.result(2, null))
                .andExpect(status().isBadRequest());
        get(Actor.COACH_BETA, oneBetaMatch())
                .andExpect(jsonPath("$.result.goalsFor").value(1));
    }

    @Test
    void onlyGoalsAgainst_isBadRequest() throws Exception {
        put(Actor.ADMIN, resultBeta(), SampleRequests.result(null, 2))
                .andExpect(status().isBadRequest());
    }

    @Test
    void player_seesOwnTeamMatchesWithoutContactDetails() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.OPPONENT_BETA))))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))))
                .andExpect(content().string(not(containsString("createdByUserId"))));
    }

    @Test
    void player_cannotAskForAnotherChildOnMatches() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/matches", "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_seesOwnChildMatches() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/matches", "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.OPPONENT_BETA))))
                .andExpect(content().string(not(containsString("@"))));
    }

    @Test
    void parent_cannotSeeAnotherChildMatches() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/matches", "childId", String.valueOf(world.playerBetaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_mustSendChildIdForMatches() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/matches").andExpect(status().isBadRequest());
    }

    @Test
    void coach_cannotOpenMyMatches() throws Exception {
        get(Actor.COACH_ALFA, "/api/my/matches").andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotOpenMyMatches() throws Exception {
        get(Actor.ADMIN, "/api/my/matches").andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotOpenMyMatches() throws Exception {
        get(Actor.CHAIRMAN, "/api/my/matches").andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotOpenMyMatches() throws Exception {
        get(Actor.ANON, "/api/my/matches").andExpect(status().isUnauthorized());
    }

    @Test
    void coach_canReadARecordedScoreOnOwnTeam() throws Exception {
        get(Actor.COACH_BETA, oneBetaMatch())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.goalsFor").value(1))
                .andExpect(jsonPath("$.result.goalsAgainst").value(0));
    }

    /** The test clock stands on 2026-01-01, so 2025-12-31 has passed. */
    private UpdateMatchRequest matchMovedToYesterday() {
        UpdateMatchRequest request = SampleRequests.matchChange();
        request.setKickoffAt(LocalDateTime.of(2025, 12, 31, 18, 0));
        return request;
    }

    private String alfaMatches() {
        return "/api/matches?teamId=" + world.teamAlfaId();
    }

    private String oneAlfaMatch() {
        return "/api/matches/" + world.matchAlfaId();
    }

    private String oneBetaMatch() {
        return "/api/matches/" + world.matchBetaId();
    }

    private String resultAlfa() {
        return oneAlfaMatch() + "/result";
    }

    private String resultBeta() {
        return oneBetaMatch() + "/result";
    }
}
