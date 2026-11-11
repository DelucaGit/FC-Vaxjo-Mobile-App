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
 * Editing and cancelling a training uses the same writers as creating one.
 * The row is not deleted. Attendance stays, and it cannot be marked after cancel.
 * Players and parents see CANCELLED on their own schedule.
 * Sending cancelled=false reactivates it: SCHEDULED again, reason cleared.
 */
class TrainingChangeAccessTest extends ClubApiTest {

    @Test
    void admin_canChangeTimePlaceAndType() throws Exception {
        put(Actor.ADMIN, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FITNESS"))
                .andExpect(jsonPath("$.venue").value("Nya hallen"))
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void chairman_canChangeATraining() throws Exception {
        put(Actor.CHAIRMAN, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isOk());
    }

    @Test
    void coach_canChangeOwnTeamTraining() throws Exception {
        put(Actor.COACH_ALFA, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotChangeTraining() throws Exception {
        put(Actor.COACH_BETA, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotChangeTraining() throws Exception {
        put(Actor.PLAYER_ALFA, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotChangeTraining() throws Exception {
        put(Actor.PARENT_ALFA, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotChangeTraining() throws Exception {
        put(Actor.ANON, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_canCancel() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Hallen stangd"));
    }

    @Test
    void chairman_canCancel() throws Exception {
        put(Actor.CHAIRMAN, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void coach_canCancelOwnTeam() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation(null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void coachFromOtherTeam_cannotCancel() throws Exception {
        put(Actor.COACH_BETA, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCancel() throws Exception {
        put(Actor.PLAYER_ALFA, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCancel() throws Exception {
        put(Actor.PARENT_ALFA, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotCancel() throws Exception {
        put(Actor.ANON, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cancelledTraining_staysOnTheTeamListWithItsAttendance() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());

        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamAlfaId())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("CANCELLED")))
                .andExpect(content().string(containsString("Hallen stangd")));

        get(Actor.COACH_ALFA, oneTraining() + "/attendance")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)));
    }

    @Test
    void cancelledTraining_rejectsNewAttendance() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());

        put(Actor.COACH_ALFA,
                oneTraining() + "/attendance/" + world.playerAlfaId(),
                SampleRequests.present())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This training is cancelled"));
    }

    @Test
    void player_seesCancelledOnMyTrainings() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());

        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("CANCELLED")))
                .andExpect(content().string(containsString("Hallen stangd")))
                .andExpect(jsonPath("$[0].trainingStatus").value("CANCELLED"));
    }

    @Test
    void parent_seesCancelledOnTheChildSchedule() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());

        get(Actor.PARENT_ALFA, "/api/my/trainings", "childId", String.valueOf(world.playerAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].trainingStatus").value("CANCELLED"))
                .andExpect(jsonPath("$[0].cancelReason").value("Hallen stangd"));
    }

    @Test
    void player_seesTheNewTypeAfterAnEdit() throws Exception {
        put(Actor.COACH_ALFA, oneTraining(), SampleRequests.trainingChange())
                .andExpect(status().isOk());

        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("FITNESS"))
                .andExpect(content().string(containsString("Nya hallen")));
    }

    @Test
    void coach_canReactivateOwnTeam_statusScheduledAndReasonEmpty() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());

        put(Actor.COACH_ALFA, cancel(), SampleRequests.reactivation())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.cancelReason").value(org.hamcrest.Matchers.nullValue()));

        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].trainingStatus").value("SCHEDULED"));
    }

    @Test
    void reactivatedTraining_acceptsAttendanceAgain() throws Exception {
        put(Actor.COACH_ALFA, cancel(), SampleRequests.cancellation("Hallen stangd"))
                .andExpect(status().isOk());
        put(Actor.COACH_ALFA, cancel(), SampleRequests.reactivation())
                .andExpect(status().isOk());

        put(Actor.COACH_ALFA,
                oneTraining() + "/attendance/" + world.playerAlfaId(),
                SampleRequests.present())
                .andExpect(status().isOk());
    }

    @Test
    void reactivatingAScheduledTraining_isHarmless() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.reactivation())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void chairman_canReactivate() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        put(Actor.CHAIRMAN, cancel(), SampleRequests.reactivation())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void coachFromOtherTeam_cannotReactivate() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        put(Actor.COACH_BETA, cancel(), SampleRequests.reactivation())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotReactivate() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        put(Actor.PLAYER_ALFA, cancel(), SampleRequests.reactivation())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotReactivate() throws Exception {
        put(Actor.ADMIN, cancel(), SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        put(Actor.PARENT_ALFA, cancel(), SampleRequests.reactivation())
                .andExpect(status().isForbidden());
    }

    private String oneTraining() {
        return "/api/trainings/" + world.trainingAlfaId();
    }

    private String cancel() {
        return oneTraining() + "/cancellation";
    }
}
