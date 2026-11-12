package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.JsonPath;

import se.fcvaxjo.api.DTO.CreateTrainingSeriesRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;

/**
 * Issue #129: POST /api/trainings/series creates many ordinary trainings.
 * Same roles and team scope as POST /api/trainings.
 *
 * The test clock stands on Thursday 2026-01-01 13:00 Swedish time.
 */
class TrainingSeriesAccessTest extends ClubApiTest {

    private static final String SERIES = "/api/trainings/series";

    // ---- the right trainings ----

    @Test
    void tuesdaysAndThursdays_forTwoWeeks_createsFourTrainingsOnThoseDays() throws Exception {
        post(Actor.COACH_ALFA, SERIES, series(world.teamAlfaId(),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 14), LocalTime.of(18, 0)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].startsAt", contains(
                        "2026-01-01T18:00:00",
                        "2026-01-06T18:00:00",
                        "2026-01-08T18:00:00",
                        "2026-01-13T18:00:00")))
                .andExpect(jsonPath("$[0].endsAt").value("2026-01-01T19:30:00"))
                .andExpect(jsonPath("$[0].type").value("FOOTBALL"))
                .andExpect(jsonPath("$[0].venue").value("Konstgräset"))
                .andExpect(jsonPath("$[0].teamId").value(world.teamAlfaId()));
    }

    @Test
    void datesAlreadyPassed_areSkipped() throws Exception {
        // From last week. Today at 12:00 has passed (it is 13:00), so only Jan 6 and 8 remain.
        post(Actor.COACH_ALFA, SERIES, series(world.teamAlfaId(),
                LocalDate.of(2025, 12, 23), LocalDate.of(2026, 1, 9), LocalTime.of(12, 0)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[*].startsAt", contains(
                        "2026-01-06T12:00:00",
                        "2026-01-08T12:00:00")));
    }

    @Test
    void admin_alsoSkipsPassedDates() throws Exception {
        // ADMIN may create a single training in the past, but a series never fills in history.
        post(Actor.ADMIN, SERIES, series(world.teamAlfaId(),
                LocalDate.of(2025, 12, 23), LocalDate.of(2025, 12, 31), LocalTime.of(18, 0)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void exactlySixtyTrainings_isAllowed() throws Exception {
        // Every day from Feb 1 to Apr 1 is 60 days.
        CreateTrainingSeriesRequest request = everyDay(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 4, 1));
        post(Actor.COACH_ALFA, SERIES, request)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(60)));
    }

    // ---- bad requests, and nothing saved ----

    @Test
    void moreThanSixtyTrainings_isBadRequest_andNothingIsCreated() throws Exception {
        int before = alfaTrainingCount();
        post(Actor.COACH_ALFA, SERIES, everyDay(LocalDate.of(2026, 2, 1), LocalDate.of(2026, 4, 2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A series may create at most 60 trainings"));
        assertEquals(before, alfaTrainingCount());
    }

    @Test
    void toDateBeforeFromDate_isBadRequest_andNothingIsCreated() throws Exception {
        int before = alfaTrainingCount();
        post(Actor.COACH_ALFA, SERIES, series(world.teamAlfaId(),
                LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 1), LocalTime.of(18, 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("toDate must not be before fromDate"));
        assertEquals(before, alfaTrainingCount());
    }

    @Test
    void noWeekdays_isBadRequest() throws Exception {
        CreateTrainingSeriesRequest request = series(world.teamAlfaId(),
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), LocalTime.of(18, 0));
        request.setWeekdays(List.of());
        post(Actor.COACH_ALFA, SERIES, request).andExpect(status().isBadRequest());
    }

    @Test
    void unknownWeekday_isBadRequest() throws Exception {
        CreateTrainingSeriesRequest request = series(world.teamAlfaId(),
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), LocalTime.of(18, 0));
        request.setWeekdays(List.of("TUESDAY", "FUNDAY"));
        post(Actor.COACH_ALFA, SERIES, request).andExpect(status().isBadRequest());
    }

    @Test
    void endTimeNotAfterStartTime_isBadRequest_andNothingIsCreated() throws Exception {
        int before = alfaTrainingCount();
        CreateTrainingSeriesRequest request = series(world.teamAlfaId(),
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), LocalTime.of(18, 0));
        request.setEndTime(LocalTime.of(18, 0));
        post(Actor.COACH_ALFA, SERIES, request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("endTime must be after startTime"));
        assertEquals(before, alfaTrainingCount());
    }

    @Test
    void unknownType_isBadRequest() throws Exception {
        CreateTrainingSeriesRequest request = series(world.teamAlfaId(),
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), LocalTime.of(18, 0));
        request.setType("YOGA");
        post(Actor.COACH_ALFA, SERIES, request).andExpect(status().isBadRequest());
    }

    // ---- roles: same as POST /api/trainings ----

    @Test
    void admin_canCreateSeries() throws Exception {
        post(Actor.ADMIN, SERIES, february(world.teamAlfaId())).andExpect(status().isCreated());
    }

    @Test
    void chairman_canCreateSeries() throws Exception {
        post(Actor.CHAIRMAN, SERIES, february(world.teamAlfaId())).andExpect(status().isCreated());
    }

    @Test
    void coach_canCreateSeriesForOwnTeam() throws Exception {
        post(Actor.COACH_ALFA, SERIES, february(world.teamAlfaId())).andExpect(status().isCreated());
    }

    @Test
    void coachFromOtherTeam_cannotCreateSeries_andNothingIsCreated() throws Exception {
        int before = alfaTrainingCount();
        post(Actor.COACH_BETA, SERIES, february(world.teamAlfaId())).andExpect(status().isForbidden());
        assertEquals(before, alfaTrainingCount());
    }

    @Test
    void player_cannotCreateSeries() throws Exception {
        post(Actor.PLAYER_ALFA, SERIES, february(world.teamAlfaId())).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateSeries() throws Exception {
        post(Actor.PARENT_ALFA, SERIES, february(world.teamAlfaId())).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotCreateSeries() throws Exception {
        post(Actor.ANON, SERIES, february(world.teamAlfaId())).andExpect(status().isUnauthorized());
    }

    // ---- helpers ----

    private int alfaTrainingCount() throws Exception {
        String body = get(Actor.ADMIN, "/api/trainings?teamId=" + world.teamAlfaId())
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Object> trainings = JsonPath.read(body, "$");
        return trainings.size();
    }

    private static CreateTrainingSeriesRequest february(long teamId) {
        return series(teamId, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), LocalTime.of(18, 0));
    }

    private CreateTrainingSeriesRequest everyDay(LocalDate from, LocalDate to) {
        CreateTrainingSeriesRequest request = series(world.teamAlfaId(), from, to, LocalTime.of(18, 0));
        request.setWeekdays(List.of(
                "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"));
        return request;
    }

    /** Tuesdays and Thursdays, 90 minutes. */
    private static CreateTrainingSeriesRequest series(
            long teamId, LocalDate from, LocalDate to, LocalTime start) {
        CreateTrainingSeriesRequest request = new CreateTrainingSeriesRequest();
        request.setTeamId(teamId);
        request.setType("FOOTBALL");
        request.setWeekdays(List.of("TUESDAY", "THURSDAY"));
        request.setStartTime(start);
        request.setEndTime(start.plusMinutes(90));
        request.setVenue("Konstgräset");
        request.setFromDate(from);
        request.setToDate(to);
        return request;
    }
}
