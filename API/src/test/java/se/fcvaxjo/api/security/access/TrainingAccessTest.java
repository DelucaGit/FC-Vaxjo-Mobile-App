package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Trainings already enforce the team scope in TrainingService.
 * x-roles is ADMIN and COACH. x-scope: COACH only for teams in team_coaches.
 * CHAIRMAN is not in x-roles for trainings, so 403 is the target.
 */
class TrainingAccessTest extends ClubApiTest {

    @Test
    void admin_canListTrainingsForAnyTeam() throws Exception {
        get(Actor.ADMIN, alfaTrainings()).andExpect(status().isOk());
    }

    @Test
    void coach_canListTrainingsForOwnTeam() throws Exception {
        get(Actor.COACH_ALFA, alfaTrainings()).andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotListTrainings() throws Exception {
        get(Actor.COACH_BETA, alfaTrainings()).andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotListTrainings() throws Exception {
        get(Actor.CHAIRMAN, alfaTrainings()).andExpect(status().isForbidden());
    }

    @Test
    void player_cannotListStaffTrainings() throws Exception {
        // Players use GET /api/my/trainings, not the staff list.
        get(Actor.PLAYER_ALFA, alfaTrainings()).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotListStaffTrainings() throws Exception {
        get(Actor.PARENT_ALFA, alfaTrainings()).andExpect(status().isForbidden());
    }

    @Test
    void admin_canReadOneTraining() throws Exception {
        get(Actor.ADMIN, oneTraining()).andExpect(status().isOk());
    }

    @Test
    void coach_canReadOwnTeamTraining() throws Exception {
        get(Actor.COACH_ALFA, oneTraining()).andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotReadTraining() throws Exception {
        get(Actor.COACH_BETA, oneTraining()).andExpect(status().isForbidden());
    }

    @Test
    void player_cannotReadStaffTraining() throws Exception {
        get(Actor.PLAYER_ALFA, oneTraining()).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotReadStaffTraining() throws Exception {
        get(Actor.PARENT_BETA, oneTraining()).andExpect(status().isForbidden());
    }

    @Test
    void admin_canCreateTraining() throws Exception {
        post(Actor.ADMIN, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_canCreateTrainingForOwnTeam() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isCreated());
    }

    @Test
    void coachFromOtherTeam_cannotCreateTraining() throws Exception {
        post(Actor.COACH_BETA, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotCreateTraining() throws Exception {
        post(Actor.CHAIRMAN, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCreateTraining() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateTraining() throws Exception {
        post(Actor.PARENT_ALFA, "/api/trainings", SampleRequests.training(world.teamAlfaId()))
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_seesPlayerNameOnOwnTeamAttendanceButNotContactDetails() throws Exception {
        // playerName and status are x-pii. Email and parent phone are not on AttendanceResponse.
        get(Actor.COACH_ALFA, attendance())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.NAME_PLAYER_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))));
    }

    @Test
    void coachFromOtherTeam_cannotSeeAttendance() throws Exception {
        get(Actor.COACH_BETA, attendance()).andExpect(status().isForbidden());
    }

    @Test
    void player_cannotSeeStaffAttendanceList() throws Exception {
        get(Actor.PLAYER_ALFA, attendance()).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotSeeStaffAttendanceList() throws Exception {
        get(Actor.PARENT_ALFA, attendance()).andExpect(status().isForbidden());
    }

    @Test
    void coach_canMarkAttendanceOnOwnTeam() throws Exception {
        put(Actor.COACH_ALFA, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isOk());
    }

    @Test
    void admin_canMarkAttendance() throws Exception {
        put(Actor.ADMIN, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotMarkAttendance() throws Exception {
        put(Actor.COACH_BETA, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotMarkAttendance() throws Exception {
        put(Actor.PLAYER_ALFA, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotMarkAttendance() throws Exception {
        put(Actor.PARENT_BETA, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotMarkAttendance() throws Exception {
        put(Actor.CHAIRMAN, markAlfaPlayer(), SampleRequests.present())
                .andExpect(status().isForbidden());
    }

    private String alfaTrainings() {
        return "/api/trainings?teamId=" + world.teamAlfaId();
    }

    private String oneTraining() {
        return "/api/trainings/" + world.trainingAlfaId();
    }

    private String attendance() {
        return oneTraining() + "/attendance";
    }

    private String markAlfaPlayer() {
        return attendance() + "/" + world.playerAlfaId();
    }
}
