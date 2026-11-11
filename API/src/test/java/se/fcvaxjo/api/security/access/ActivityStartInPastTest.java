package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.DTO.CreateMatchRequest;
import se.fcvaxjo.api.DTO.CreateTrainingRequest;
import se.fcvaxjo.api.DTO.UpdateTrainingRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;
import se.fcvaxjo.api.support.TestClock;

/**
 * Issue #115: a training or match may not start in the past, except for ADMIN.
 *
 * The test clock stands on 2026-01-01 12:00 UTC, which is 13:00 in Sweden.
 * TODAY_EARLIER is 12:30 Swedish time the same day: already passed in Sweden,
 * although 12:30 would still be ahead in UTC. So it also checks the time zone.
 */
class ActivityStartInPastTest extends ClubApiTest {

    private static final LocalDateTime YESTERDAY = LocalDateTime.of(2025, 12, 31, 18, 0);
    private static final LocalDateTime TODAY_EARLIER = LocalDateTime.of(2026, 1, 1, 12, 30);
    private static final LocalDateTime TODAY_LATER = LocalDateTime.of(2026, 1, 1, 13, 30);

    /** A few days after the fixture training (2026-11-06 18:00), so it is old. */
    private static final Instant AFTER_FIXTURE_TRAINING = Instant.parse("2026-11-10T12:00:00Z");

    @Autowired
    private TestClock clock;

    // ---- create training ----

    @Test
    void coach_cannotCreateTrainingYesterday() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", training(YESTERDAY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("passerat")));
    }

    @Test
    void coach_cannotCreateTrainingEarlierToday() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", training(TODAY_EARLIER))
                .andExpect(status().isBadRequest());
    }

    @Test
    void chairman_cannotCreateTrainingInThePast() throws Exception {
        post(Actor.CHAIRMAN, "/api/trainings", training(YESTERDAY))
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_canCreateTrainingInThePast() throws Exception {
        post(Actor.ADMIN, "/api/trainings", training(YESTERDAY))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_canCreateTrainingLaterToday() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", training(TODAY_LATER))
                .andExpect(status().isCreated());
    }

    // ---- create match ----

    @Test
    void coach_cannotCreateMatchInThePast() throws Exception {
        post(Actor.COACH_ALFA, "/api/matches", match(TODAY_EARLIER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("passerat")));
    }

    @Test
    void chairman_cannotCreateMatchInThePast() throws Exception {
        post(Actor.CHAIRMAN, "/api/matches", match(YESTERDAY))
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_canCreateMatchInThePast() throws Exception {
        post(Actor.ADMIN, "/api/matches", match(YESTERDAY))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_canCreateMatchLaterToday() throws Exception {
        post(Actor.COACH_ALFA, "/api/matches", match(TODAY_LATER))
                .andExpect(status().isCreated());
    }

    // ---- change an old training ----

    @Test
    void coach_canChangeOnlyThePlaceOfAnOldTraining() throws Exception {
        moveClockTo(AFTER_FIXTURE_TRAINING);
        put(Actor.COACH_ALFA, oneTraining(), sameTimeNewPlace())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.venue").value("Nya hallen"));
    }

    @Test
    void coach_cannotMoveATrainingToAnotherPastTime() throws Exception {
        moveClockTo(AFTER_FIXTURE_TRAINING);
        put(Actor.COACH_ALFA, oneTraining(), movedTo(LocalDateTime.of(2026, 11, 7, 18, 0)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void chairman_cannotMoveATrainingIntoThePast() throws Exception {
        put(Actor.CHAIRMAN, oneTraining(), movedTo(YESTERDAY))
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_canMoveATrainingIntoThePast() throws Exception {
        put(Actor.ADMIN, oneTraining(), movedTo(YESTERDAY))
                .andExpect(status().isOk());
    }

    private CreateTrainingRequest training(LocalDateTime startsAt) {
        CreateTrainingRequest request = SampleRequests.training(world.teamAlfaId());
        request.setStartsAt(startsAt);
        request.setEndsAt(startsAt.plusHours(1));
        return request;
    }

    private CreateMatchRequest match(LocalDateTime kickoffAt) {
        CreateMatchRequest request = SampleRequests.match(world.teamAlfaId());
        request.setKickoffAt(kickoffAt);
        return request;
    }

    /** Same start and end as the fixture training, only a new place. */
    private UpdateTrainingRequest sameTimeNewPlace() {
        UpdateTrainingRequest request = SampleRequests.trainingChange();
        request.setStartsAt(LocalDateTime.of(2026, 11, 6, 18, 0));
        request.setEndsAt(LocalDateTime.of(2026, 11, 6, 19, 30));
        return request;
    }

    private UpdateTrainingRequest movedTo(LocalDateTime startsAt) {
        UpdateTrainingRequest request = SampleRequests.trainingChange();
        request.setStartsAt(startsAt);
        request.setEndsAt(startsAt.plusHours(1));
        return request;
    }

    private String oneTraining() {
        return "/api/trainings/" + world.trainingAlfaId();
    }

    private void moveClockTo(Instant target) {
        clock.advance(Duration.between(TestClock.START, target));
    }
}
