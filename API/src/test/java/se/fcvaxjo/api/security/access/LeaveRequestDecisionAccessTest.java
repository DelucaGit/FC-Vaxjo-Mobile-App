package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.LeaveRequest;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.repository.LeaveRequestRepository;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import tools.jackson.databind.JsonNode;

/**
 * Staff answer leave requests (issue #213).
 * COACH only for teams they coach (team_coaches), CHAIRMAN and ADMIN for every team (ADR 0006).
 * A coach of another team gets 403, same as for trainings and matches.
 * Only PENDING can be answered. Approve sets the attendance to EXCUSED, unless the list is locked.
 * Afterwards the attendance endpoints refuse to change EXCUSED for that player (400).
 */
class LeaveRequestDecisionAccessTest extends ClubApiTest {

    private static final String MY_PATH = "/api/my/leave-requests";
    private static final String PATH = "/api/leave-requests";
    private static final long UNKNOWN_ID = 999_999L;
    private static final String ALFA_REASON = "Hemlig orsak Alfa";
    private static final String BETA_REASON = "Hemlig orsak Beta";

    /** TestClock.START (2026-01-01 12:00 UTC) in Swedish time. */
    private static final LocalDateTime DECIDED_AT = LocalDateTime.of(2026, 1, 1, 13, 0);

    @Autowired
    private LeaveRequestRepository leaveRequests;

    @Autowired
    private TrainingRepository trainings;

    @Autowired
    private MatchRepository matches;

    // ---- list: who may ----

    @Test
    void coach_listsOnlyOwnTeamsRequests_withAllFields() throws Exception {
        createAlfaTrainingRequest();
        createBetaMatchRequest();
        get(Actor.COACH_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", notNullValue()))
                .andExpect(jsonPath("$[0].playerUserId").value(world.playerAlfaId()))
                .andExpect(jsonPath("$[0].playerName", notNullValue()))
                .andExpect(jsonPath("$[0].teamId").value(world.teamAlfaId()))
                .andExpect(jsonPath("$[0].teamName").value(ClubFixture.TEAM_ALFA))
                .andExpect(jsonPath("$[0].activityKind").value("TRAINING"))
                .andExpect(jsonPath("$[0].activityId").value(world.trainingAlfaId()))
                .andExpect(jsonPath("$[0].activityStart", startsWith("2026-11-06T18:00")))
                .andExpect(jsonPath("$[0].reasonType").value("OTHER"))
                .andExpect(jsonPath("$[0].reasonText").value(ALFA_REASON))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].createdAt", notNullValue()))
                .andExpect(content().string(not(containsString(BETA_REASON))));
    }

    @Test
    void coachBeta_listsOnlyBeta() throws Exception {
        createAlfaTrainingRequest();
        createBetaMatchRequest();
        get(Actor.COACH_BETA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value(world.playerBetaId()))
                .andExpect(content().string(not(containsString(ALFA_REASON))));
    }

    @Test
    void coach_askingForAnotherTeam_isForbidden() throws Exception {
        createBetaMatchRequest();
        get(Actor.COACH_ALFA, PATH, "teamId", String.valueOf(world.teamBetaId()))
                .andExpect(status().isForbidden())
                .andExpect(content().string(not(containsString(BETA_REASON))));
    }

    @Test
    void coach_askingForOwnTeam_isAllowed() throws Exception {
        createAlfaTrainingRequest();
        get(Actor.COACH_ALFA, PATH, "teamId", String.valueOf(world.teamAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void chairman_listsAllTeams() throws Exception {
        createAlfaTrainingRequest();
        createBetaMatchRequest();
        get(Actor.CHAIRMAN, PATH).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void admin_listsAllTeams() throws Exception {
        createAlfaTrainingRequest();
        createBetaMatchRequest();
        get(Actor.ADMIN, PATH).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void chairman_canFilterByTeam() throws Exception {
        createAlfaTrainingRequest();
        createBetaMatchRequest();
        get(Actor.CHAIRMAN, PATH, "teamId", String.valueOf(world.teamBetaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].teamId").value(world.teamBetaId()));
    }

    @Test
    void statusFilter_showsOnlyPending() throws Exception {
        long approved = createAlfaTrainingRequest();
        createAlfaMatchRequestForExtra();
        post(Actor.COACH_ALFA, approve(approved), null).andExpect(status().isOk());
        get(Actor.COACH_ALFA, PATH, "status", "PENDING")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].playerUserId").value(world.extraPlayerId()));
        get(Actor.COACH_ALFA, PATH).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void unknownStatusFilter_isRejected() throws Exception {
        get(Actor.COACH_ALFA, PATH, "status", "MAYBE")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void player_cannotList() throws Exception {
        get(Actor.PLAYER_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotList() throws Exception {
        get(Actor.PARENT_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotList() throws Exception {
        get(Actor.ANON, PATH).andExpect(status().isUnauthorized());
    }

    // ---- approve: who may ----

    @Test
    void coach_approvesOwnTeamsRequest_andStoresWhoAndWhen() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, approve(id), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("APPROVED"));
        LeaveRequest row = leaveRequests.findById(id).orElseThrow();
        assertEquals(world.coachAlfaId(), row.getDecidedByUserId());
        assertEquals(DECIDED_AT, row.getDecidedAt());
    }

    @Test
    void coachOfAnotherTeam_cannotApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_BETA, approve(id), null).andExpect(status().isForbidden());
        assertEquals("PENDING", leaveRequests.findById(id).orElseThrow().getStatus().name());
    }

    @Test
    void chairman_canApprove() throws Exception {
        long id = createBetaMatchRequest();
        post(Actor.CHAIRMAN, approve(id), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
        assertEquals(world.chairmanId(), leaveRequests.findById(id).orElseThrow().getDecidedByUserId());
    }

    @Test
    void admin_canApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.ADMIN, approve(id), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void player_cannotApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.PLAYER_ALFA, approve(id), null).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.PARENT_ALFA, approve(id), null).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.ANON, approve(id), null).andExpect(status().isUnauthorized());
    }

    @Test
    void unknownRequest_isNotFound() throws Exception {
        post(Actor.COACH_ALFA, approve(UNKNOWN_ID), null).andExpect(status().isNotFound());
        post(Actor.COACH_ALFA, deny(UNKNOWN_ID), null).andExpect(status().isNotFound());
    }

    // ---- approve: rules ----

    @Test
    void approve_setsTrainingAttendanceToExcused() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        assertEquals("EXCUSED", attendanceStatus(trainingAttendance(), world.playerAlfaId()));
    }

    @Test
    void approve_setsMatchAttendanceToExcused() throws Exception {
        long id = createAlfaMatchRequestForExtra();
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        assertEquals("EXCUSED", attendanceStatus(matchAttendance(), world.extraPlayerId()));
    }

    @Test
    void approve_overwritesAnEarlierMark() throws Exception {
        long id = createAlfaTrainingRequest();
        moveClockTo(FIXTURE_TRAINING_START);
        put(Actor.COACH_ALFA, trainingAttendance() + "/" + world.playerAlfaId(), Map.of("status", "ABSENT"))
                .andExpect(status().isOk());
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        assertEquals("EXCUSED", attendanceStatus(trainingAttendance(), world.playerAlfaId()));
    }

    @Test
    void approvedRequest_cannotBeAnsweredAgain() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        post(Actor.COACH_ALFA, approve(id), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
        post(Actor.COACH_ALFA, deny(id), Map.of("note", "Nej")).andExpect(status().isBadRequest());
        assertEquals("APPROVED", leaveRequests.findById(id).orElseThrow().getStatus().name());
    }

    @Test
    void lockedTrainingAttendance_blocksApprove() throws Exception {
        long id = createAlfaTrainingRequest();
        Training training = trainings.findById(world.trainingAlfaId()).orElseThrow();
        training.setAttendanceLockedAt(DECIDED_AT);
        trainings.saveAndFlush(training);
        post(Actor.COACH_ALFA, approve(id), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
        assertEquals("PENDING", leaveRequests.findById(id).orElseThrow().getStatus().name());
    }

    @Test
    void lockedMatchAttendance_blocksApprove() throws Exception {
        long id = createAlfaMatchRequestForExtra();
        Match match = matches.findById(world.matchAlfaId()).orElseThrow();
        match.setAttendanceLockedAt(DECIDED_AT);
        matches.saveAndFlush(match);
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isBadRequest());
        assertEquals("PENDING", leaveRequests.findById(id).orElseThrow().getStatus().name());
    }

    // ---- deny ----

    @Test
    void coach_deniesWithNote_andAttendanceIsUntouched() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, deny(id), Map.of("note", " Viktig match, kom gärna "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"))
                .andExpect(jsonPath("$.coachNote").value("Viktig match, kom gärna"));
        LeaveRequest row = leaveRequests.findById(id).orElseThrow();
        assertEquals(world.coachAlfaId(), row.getDecidedByUserId());
        assertEquals(DECIDED_AT, row.getDecidedAt());
        assertNull(attendanceStatus(trainingAttendance(), world.playerAlfaId()));
    }

    @Test
    void deny_withoutBody_hasNoNote() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, deny(id), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"))
                .andExpect(jsonPath("$.coachNote", nullValue()));
    }

    @Test
    void deniedRequest_cannotBeAnsweredAgain() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, deny(id), null).andExpect(status().isOk());
        post(Actor.COACH_ALFA, deny(id), null).andExpect(status().isBadRequest());
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isBadRequest());
        assertNull(attendanceStatus(trainingAttendance(), world.playerAlfaId()));
    }

    @Test
    void coachOfAnotherTeam_cannotDeny() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_BETA, deny(id), null).andExpect(status().isForbidden());
        assertEquals("PENDING", leaveRequests.findById(id).orElseThrow().getStatus().name());
    }

    @Test
    void chairman_canDeny() throws Exception {
        long id = createBetaMatchRequest();
        post(Actor.CHAIRMAN, deny(id), null).andExpect(status().isOk());
    }

    @Test
    void admin_canDeny() throws Exception {
        long id = createBetaMatchRequest();
        post(Actor.ADMIN, deny(id), null).andExpect(status().isOk());
    }

    @Test
    void player_cannotDeny() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.PLAYER_ALFA, deny(id), null).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotDeny() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.PARENT_ALFA, deny(id), null).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotDeny() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.ANON, deny(id), null).andExpect(status().isUnauthorized());
    }

    // ---- saving attendance afterwards ----

    @Test
    void afterApprove_trainingAttendanceCannotBeChangedFromExcused() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        moveClockTo(FIXTURE_TRAINING_START);
        put(Actor.COACH_ALFA, trainingAttendance() + "/" + world.playerAlfaId(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
        assertEquals("EXCUSED", attendanceStatus(trainingAttendance(), world.playerAlfaId()));
        put(Actor.COACH_ALFA, trainingAttendance() + "/" + world.playerAlfaId(), Map.of("status", "EXCUSED"))
                .andExpect(status().isOk());
    }

    @Test
    void afterApprove_matchAttendanceCannotBeChangedFromExcused() throws Exception {
        long id = createAlfaMatchRequestForExtra();
        post(Actor.COACH_ALFA, approve(id), null).andExpect(status().isOk());
        moveClockTo(FIXTURE_MATCH_KICKOFF);
        put(Actor.COACH_ALFA, matchAttendance() + "/" + world.extraPlayerId(), Map.of("status", "ABSENT"))
                .andExpect(status().isBadRequest());
        assertEquals("EXCUSED", attendanceStatus(matchAttendance(), world.extraPlayerId()));
    }

    @Test
    void afterDeny_attendanceCanBeMarkedAsUsual() throws Exception {
        long id = createAlfaTrainingRequest();
        post(Actor.COACH_ALFA, deny(id), null).andExpect(status().isOk());
        moveClockTo(FIXTURE_TRAINING_START);
        put(Actor.COACH_ALFA, trainingAttendance() + "/" + world.playerAlfaId(), Map.of("status", "PRESENT"))
                .andExpect(status().isOk());
        assertEquals("PRESENT", attendanceStatus(trainingAttendance(), world.playerAlfaId()));
    }

    // ---- helpers ----

    private static String approve(long id) {
        return PATH + "/" + id + "/approve";
    }

    private static String deny(long id) {
        return PATH + "/" + id + "/deny";
    }

    private String trainingAttendance() {
        return "/api/trainings/" + world.trainingAlfaId() + "/attendance";
    }

    private String matchAttendance() {
        return "/api/matches/" + world.matchAlfaId() + "/attendance";
    }

    /** The player's status on the attendance list, as the coach sees it. Null when not marked. */
    private String attendanceStatus(String attendancePath, long playerUserId) throws Exception {
        String body = get(Actor.COACH_ALFA, attendancePath)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode row : json.readTree(body)) {
            if (row.get("playerUserId").asLong() == playerUserId) {
                JsonNode value = row.get("status");
                return value == null || value.isNull() ? null : value.asString();
            }
        }
        throw new AssertionError("Player " + playerUserId + " is not on the attendance list");
    }

    private long createAlfaTrainingRequest() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainingId", world.trainingAlfaId());
        body.put("reasonType", "OTHER");
        body.put("reasonText", ALFA_REASON);
        return createdId(post(Actor.PLAYER_ALFA, MY_PATH, body)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private long createAlfaMatchRequestForExtra() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("matchId", world.matchAlfaId());
        body.put("playerUserId", world.extraPlayerId());
        body.put("reasonType", "SICK");
        return createdId(post(Actor.PARENT_ALFA, MY_PATH, body)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private long createBetaMatchRequest() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("matchId", world.matchBetaId());
        body.put("playerUserId", world.playerBetaId());
        body.put("reasonType", "OTHER");
        body.put("reasonText", BETA_REASON);
        return createdId(post(Actor.PARENT_BETA, MY_PATH, body)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private long createdId(String body) {
        return json.readTree(body).get("id").asLong();
    }
}
