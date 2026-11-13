package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.Map;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Issue #133: calling a match off and reactivating it.
 * Same shape as trainings: PUT /api/matches/{id}/cancellation with cancelled true/false.
 * Same writers as editing a match: ADMIN, CHAIRMAN, and the team's own coach.
 * The row is not deleted. While it is cancelled, attendance, "Klar" and result are 400.
 */
class MatchCancelAccessTest extends ClubApiTest {

    private static final String CANCELLED = "This match is cancelled";

    // ---- roles and team scope ----

    @Test
    void admin_canCancel() throws Exception {
        put(Actor.ADMIN, cancellation(), SampleRequests.matchCancellation("Motstandaren lamnade WO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Motstandaren lamnade WO"));
    }

    @Test
    void chairman_canCancel() throws Exception {
        put(Actor.CHAIRMAN, cancellation(), SampleRequests.matchCancellation("Regn"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void coach_canCancelOwnTeam_reasonIsOptional() throws Exception {
        put(Actor.COACH_ALFA, cancellation(), SampleRequests.matchCancellation("  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value(nullValue()));
    }

    @Test
    void coachFromOtherTeam_playerAndParent_areForbidden() throws Exception {
        for (Actor actor : new Actor[] { Actor.COACH_BETA, Actor.PLAYER_ALFA, Actor.PARENT_ALFA }) {
            put(actor, cancellation(), SampleRequests.matchCancellation("Regn"))
                    .andExpect(status().isForbidden());
            put(actor, cancellation(), SampleRequests.matchReactivation())
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void anonymous_isUnauthorized() throws Exception {
        put(Actor.ANON, cancellation(), SampleRequests.matchCancellation("Regn"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownMatch_isNotFoundForAdmin_andForbiddenForCoach() throws Exception {
        put(Actor.ADMIN, "/api/matches/999999/cancellation", SampleRequests.matchCancellation(null))
                .andExpect(status().isNotFound());
        put(Actor.COACH_ALFA, "/api/matches/999999/cancellation", SampleRequests.matchCancellation(null))
                .andExpect(status().isForbidden());
    }

    // ---- cancel and reactivate ----

    @Test
    void newMatch_isScheduled() throws Exception {
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.cancelReason").value(nullValue()));
    }

    @Test
    void cancelledMatch_staysOnTheTeamList() throws Exception {
        cancel();

        get(Actor.COACH_ALFA, "/api/matches", "teamId", String.valueOf(world.teamAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + world.matchAlfaId() + ")].status")
                        .value(contains("CANCELLED")));
    }

    @Test
    void reactivate_makesItScheduledAgain_andClearsTheReason() throws Exception {
        cancel();

        put(Actor.COACH_ALFA, cancellation(), SampleRequests.matchReactivation())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.cancelReason").value(nullValue()));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void reactivate_onAScheduledMatch_changesNothing() throws Exception {
        put(Actor.ADMIN, cancellation(), SampleRequests.matchReactivation())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void reactivate_coachOwnTeam_canMarkAttendanceAgain() throws Exception {
        moveClockTo(FIXTURE_MATCH_KICKOFF);
        cancel();
        put(Actor.COACH_ALFA, cancellation(), SampleRequests.matchReactivation()).andExpect(status().isOk());

        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT"))
                .andExpect(status().isOk());
    }

    @Test
    void cancelledMatch_canStillBeEdited() throws Exception {
        cancel();

        put(Actor.COACH_ALFA, oneMatch(), SampleRequests.matchChange())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opponent").value("Flyttad motstandare"))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void player_seesCancelledOnMyMatches() throws Exception {
        cancel();

        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + world.matchAlfaId() + ")].status")
                        .value(contains("CANCELLED")))
                .andExpect(jsonPath("$[?(@.id == " + world.matchAlfaId() + ")].cancelReason")
                        .value(contains("Regn")));
    }

    // ---- blocked while cancelled ----

    @Test
    void cancelledMatch_rejectsAttendanceAndLock() throws Exception {
        // At kickoff the attendance window is open, so only the cancel can block it.
        moveClockTo(FIXTURE_MATCH_KICKOFF);
        cancel();

        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(CANCELLED));
        put(Actor.COACH_ALFA, oneMatch() + "/attendance/lock", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(CANCELLED));
    }

    @Test
    void cancelledMatch_rejectsResult() throws Exception {
        cancel();

        put(Actor.COACH_ALFA, oneMatch() + "/result", SampleRequests.result(2, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(CANCELLED));
    }

    @Test
    void cancelledMatch_isNotAutoFrozen() throws Exception {
        cancel();
        moveClockTo(FIXTURE_MATCH_KICKOFF.plus(Duration.ofHours(9)));

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
    }

    private void cancel() throws Exception {
        put(Actor.COACH_ALFA, cancellation(), SampleRequests.matchCancellation("Regn"))
                .andExpect(status().isOk());
    }

    private String oneMatch() {
        return "/api/matches/" + world.matchAlfaId();
    }

    private String cancellation() {
        return oneMatch() + "/cancellation";
    }

    private String markPlayer() {
        return oneMatch() + "/attendance/" + world.playerAlfaId();
    }
}
