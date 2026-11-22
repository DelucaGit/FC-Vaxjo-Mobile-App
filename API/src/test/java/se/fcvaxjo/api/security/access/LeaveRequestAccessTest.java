package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.LeaveRequest;
import se.fcvaxjo.api.model.LeaveRequestStatus;
import se.fcvaxjo.api.repository.LeaveRequestRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Leave requests (issue #210). PLAYER asks for themself, PARENT for their own children.
 * The player must belong to the activity's team. Only before the start and not for a cancelled activity.
 * COACH, CHAIRMAN and ADMIN cannot use these "my" endpoints. The reason is x-pii.
 */
class LeaveRequestAccessTest extends ClubApiTest {

    private static final String PATH = "/api/my/leave-requests";
    private static final long UNKNOWN_ID = 999_999L;
    private static final String SECRET_REASON = "Hemlig orsak Alfa";

    @Autowired
    private LeaveRequestRepository leaveRequests;

    // ---- create: who may ----

    @Test
    void player_createsForOwnTraining_isPendingWithAllFields() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.playerUserId").value(world.playerAlfaId()))
                .andExpect(jsonPath("$.activityKind").value("TRAINING"))
                .andExpect(jsonPath("$.activityId").value(world.trainingAlfaId()))
                .andExpect(jsonPath("$.activityStart", startsWith("2026-11-06T18:00")))
                .andExpect(jsonPath("$.teamName").value(ClubFixture.TEAM_ALFA))
                .andExpect(jsonPath("$.reasonType").value("SICK"))
                .andExpect(jsonPath("$.reasonText", nullValue()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.coachNote", nullValue()))
                .andExpect(jsonPath("$.createdAt", notNullValue()));
    }

    @Test
    void player_createsForOwnMatch() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forMatch(world.matchAlfaId(), null, "SCHOOL", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.activityKind").value("MATCH"))
                .andExpect(jsonPath("$.activityId").value(world.matchAlfaId()))
                .andExpect(jsonPath("$.activityStart", startsWith("2026-12-12T14:00")))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void player_givingOwnIdAsPlayerUserId_isAllowed() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "FAMILY", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.playerUserId").value(world.playerAlfaId()));
    }

    @Test
    void player_cannotCreateForAnotherPlayer() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), world.extraPlayerId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCreateForAnotherTeamsActivity() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forMatch(world.matchBetaId(), null, "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_createsForOwnChild() throws Exception {
        post(Actor.PARENT_ALFA, PATH, forTraining(world.trainingAlfaId(), world.extraPlayerId(), "INJURY", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.playerUserId").value(world.extraPlayerId()))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void parent_mustSayWhichChild() throws Exception {
        post(Actor.PARENT_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void parent_cannotCreateForAnotherParentsChild() throws Exception {
        post(Actor.PARENT_BETA, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateWhenChildIsNotInTheActivitysTeam() throws Exception {
        // The Beta player is PARENT_BETA's own child, but the training belongs to Alfa.
        post(Actor.PARENT_BETA, PATH, forTraining(world.trainingAlfaId(), world.playerBetaId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateForAnUnknownPlayer() throws Exception {
        post(Actor.PARENT_ALFA, PATH, forTraining(world.trainingAlfaId(), UNKNOWN_ID, "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_cannotCreate() throws Exception {
        post(Actor.COACH_ALFA, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotCreate() throws Exception {
        post(Actor.CHAIRMAN, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotCreate() throws Exception {
        post(Actor.ADMIN, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "SICK", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotCreate() throws Exception {
        post(Actor.ANON, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "SICK", null))
                .andExpect(status().isUnauthorized());
    }

    // ---- create: rules ----

    @Test
    void bothTrainingAndMatch_isRejected() throws Exception {
        Map<String, Object> body = forTraining(world.trainingAlfaId(), null, "SICK", null);
        body.put("matchId", world.matchAlfaId());
        post(Actor.PLAYER_ALFA, PATH, body).andExpect(status().isBadRequest());
    }

    @Test
    void neitherTrainingNorMatch_isRejected() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(null, null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownTraining_isNotFound() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(UNKNOWN_ID, null, "SICK", null))
                .andExpect(status().isNotFound());
    }

    @Test
    void unknownMatch_isNotFound() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forMatch(UNKNOWN_ID, null, "SICK", null))
                .andExpect(status().isNotFound());
    }

    @Test
    void missingReasonType_isRejected() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, null, null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownReasonType_isRejected() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "BORED", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void otherWithoutText_isRejected() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "OTHER", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otherWithTooShortTextAfterTrim_isRejected() throws Exception {
        // "  abcd  " is 8 characters, but only 4 after trim.
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "OTHER", "  abcd  "))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otherWithFiveCharacters_isAccepted() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "OTHER", " Resa! "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reasonType").value("OTHER"))
                .andExpect(jsonPath("$.reasonText").value("Resa!"));
    }

    @Test
    void atStartTime_isRejected() throws Exception {
        moveClockTo(FIXTURE_TRAINING_START);
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void afterStartTime_isRejected() throws Exception {
        moveClockTo(FIXTURE_MATCH_KICKOFF.plusSeconds(60));
        post(Actor.PLAYER_ALFA, PATH, forMatch(world.matchAlfaId(), null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void justBeforeStartTime_isAccepted() throws Exception {
        moveClockTo(FIXTURE_TRAINING_START.minusSeconds(60));
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isCreated());
    }

    @Test
    void cancelledTraining_isRejected() throws Exception {
        put(Actor.COACH_ALFA, "/api/trainings/" + world.trainingAlfaId() + "/cancellation",
                SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancelledMatch_isRejected() throws Exception {
        put(Actor.COACH_ALFA, "/api/matches/" + world.matchAlfaId() + "/cancellation",
                SampleRequests.matchCancellation("Regn"))
                .andExpect(status().isOk());
        post(Actor.PLAYER_ALFA, PATH, forMatch(world.matchAlfaId(), null, "SICK", null))
                .andExpect(status().isBadRequest());
    }

    @Test
    void secondRequestForSamePlayerAndActivity_isRejected() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isCreated());
        // Also when the parent sends it for the same child.
        post(Actor.PARENT_ALFA, PATH, forTraining(world.trainingAlfaId(), world.playerAlfaId(), "FAMILY", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void samePlayerMayAskForATrainingAndAMatch() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "SICK", null))
                .andExpect(status().isCreated());
        post(Actor.PLAYER_ALFA, PATH, forMatch(world.matchAlfaId(), null, "SICK", null))
                .andExpect(status().isCreated());
    }

    // ---- list ----

    @Test
    void player_listsOnlyOwnRequests() throws Exception {
        createAsPlayer(SECRET_REASON);
        createForExtraAsParent();
        get(Actor.PLAYER_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value(world.playerAlfaId()))
                .andExpect(jsonPath("$[0].reasonText").value(SECRET_REASON));
    }

    @Test
    void player_cannotPassChildId() throws Exception {
        get(Actor.PLAYER_ALFA, PATH, "childId", String.valueOf(world.extraPlayerId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_listsAllOwnChildrenWithoutChildId() throws Exception {
        createAsPlayer(SECRET_REASON);
        createForExtraAsParent();
        get(Actor.PARENT_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void parent_listsOneChildWithChildId() throws Exception {
        createAsPlayer(SECRET_REASON);
        createForExtraAsParent();
        get(Actor.PARENT_ALFA, PATH, "childId", String.valueOf(world.extraPlayerId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value(world.extraPlayerId()));
    }

    @Test
    void otherParent_doesNotSeeTheReason() throws Exception {
        createAsPlayer(SECRET_REASON);
        get(Actor.PARENT_BETA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)))
                .andExpect(content().string(not(containsString(SECRET_REASON))));
    }

    @Test
    void otherParent_cannotListAnotherParentsChild() throws Exception {
        createAsPlayer(SECRET_REASON);
        get(Actor.PARENT_BETA, PATH, "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isForbidden())
                .andExpect(content().string(not(containsString(SECRET_REASON))));
    }

    @Test
    void coach_cannotList() throws Exception {
        get(Actor.COACH_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotList() throws Exception {
        get(Actor.CHAIRMAN, PATH).andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotList() throws Exception {
        get(Actor.ADMIN, PATH).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotList() throws Exception {
        get(Actor.ANON, PATH).andExpect(status().isUnauthorized());
    }

    // ---- withdraw ----

    @Test
    void player_withdrawsOwnPendingRequest() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.PLAYER_ALFA, PATH + "/" + id).andExpect(status().isNoContent());
        get(Actor.PLAYER_ALFA, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void parent_withdrawsOwnChildsPendingRequest() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.PARENT_ALFA, PATH + "/" + id).andExpect(status().isNoContent());
    }

    @Test
    void player_cannotWithdrawAnotherPlayersRequest() throws Exception {
        long id = createForExtraAsParent();
        delete(Actor.PLAYER_ALFA, PATH + "/" + id).andExpect(status().isNotFound());
    }

    @Test
    void otherParent_cannotWithdraw() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.PARENT_BETA, PATH + "/" + id).andExpect(status().isNotFound());
    }

    @Test
    void unknownRequest_isNotFound() throws Exception {
        delete(Actor.PLAYER_ALFA, PATH + "/" + UNKNOWN_ID).andExpect(status().isNotFound());
    }

    @Test
    void answeredRequest_cannotBeWithdrawn() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        LeaveRequest row = leaveRequests.findById(id).orElseThrow();
        row.setStatus(LeaveRequestStatus.APPROVED);
        leaveRequests.saveAndFlush(row);
        delete(Actor.PLAYER_ALFA, PATH + "/" + id).andExpect(status().isBadRequest());
    }

    @Test
    void coach_cannotWithdraw() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.COACH_ALFA, PATH + "/" + id).andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotWithdraw() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.CHAIRMAN, PATH + "/" + id).andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotWithdraw() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.ADMIN, PATH + "/" + id).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotWithdraw() throws Exception {
        long id = createAsPlayer(SECRET_REASON);
        delete(Actor.ANON, PATH + "/" + id).andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private long createAsPlayer(String reasonText) throws Exception {
        String body = post(Actor.PLAYER_ALFA, PATH, forTraining(world.trainingAlfaId(), null, "OTHER", reasonText))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private long createForExtraAsParent() throws Exception {
        String body = post(Actor.PARENT_ALFA, PATH, forMatch(world.matchAlfaId(), world.extraPlayerId(), "SICK", null))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private static Map<String, Object> forTraining(Long trainingId, Long playerUserId, String type, String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("trainingId", trainingId);
        body.put("playerUserId", playerUserId);
        body.put("reasonType", type);
        body.put("reasonText", text);
        return body;
    }

    private static Map<String, Object> forMatch(Long matchId, Long playerUserId, String type, String text) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("matchId", matchId);
        body.put("playerUserId", playerUserId);
        body.put("reasonType", type);
        body.put("reasonText", text);
        return body;
    }
}
