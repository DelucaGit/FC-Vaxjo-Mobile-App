package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.DTO.CreateMatchRequest;
import se.fcvaxjo.api.DTO.UpdateMatchRequest;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Issue #219: a match may have an optional end time (endsAt).
 *
 * When endsAt is set, the automatic attendance freeze counts from it, with the same
 * 6 hours a training gets after it ends. When endsAt is null, the freeze is unchanged:
 * 8 hours after kickoff.
 *
 * The fixture match on team Alfa kicks off 2026-12-12 14:00 Swedish time (13:00 UTC).
 * Without an end time it freezes after 2026-12-12 21:00 UTC.
 */
class MatchEndTimeTest extends ClubApiTest {

    private static final String END_NOT_AFTER_KICKOFF = "Sluttiden måste vara efter avsparken.";

    /** Kickoff of SampleRequests.match(...). */
    private static final LocalDateTime NEW_KICKOFF = LocalDateTime.of(2026, 12, 20, 13, 0);

    /** Kickoff of SampleRequests.matchChange(). */
    private static final LocalDateTime CHANGED_KICKOFF = LocalDateTime.of(2026, 12, 21, 15, 0);

    @Autowired
    private MatchRepository matches;

    // ---- create ----

    @Test
    void create_withoutEndsAt_returnsNullEndsAt() throws Exception {
        post(Actor.ADMIN, "/api/matches", SampleRequests.match(world.teamAlfaId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endsAt").value(nullValue()));
    }

    @Test
    void create_withEndsAt_returnsIt() throws Exception {
        CreateMatchRequest request = SampleRequests.match(world.teamAlfaId());
        request.setEndsAt(NEW_KICKOFF.plusHours(2));

        post(Actor.COACH_ALFA, "/api/matches", request)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.endsAt").value("2026-12-20T15:00:00"));
    }

    @Test
    void create_endsAtBeforeKickoff_isBadRequest() throws Exception {
        CreateMatchRequest request = SampleRequests.match(world.teamAlfaId());
        request.setEndsAt(NEW_KICKOFF.minusMinutes(1));

        post(Actor.ADMIN, "/api/matches", request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(END_NOT_AFTER_KICKOFF));
    }

    @Test
    void create_endsAtEqualToKickoff_isBadRequest() throws Exception {
        CreateMatchRequest request = SampleRequests.match(world.teamAlfaId());
        request.setEndsAt(NEW_KICKOFF);

        post(Actor.ADMIN, "/api/matches", request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(END_NOT_AFTER_KICKOFF));
    }

    // ---- update ----

    @Test
    void update_setsEndsAt_thenClearsIt() throws Exception {
        UpdateMatchRequest withEnd = SampleRequests.matchChange();
        withEnd.setEndsAt(CHANGED_KICKOFF.plusHours(2));

        put(Actor.COACH_ALFA, oneMatch(), withEnd)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endsAt").value("2026-12-21T17:00:00"));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.endsAt").value("2026-12-21T17:00:00"));

        // PUT replaces the details, so leaving endsAt out clears it.
        put(Actor.COACH_ALFA, oneMatch(), SampleRequests.matchChange())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endsAt").value(nullValue()));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.endsAt").value(nullValue()));
    }

    @Test
    void update_endsAtNotAfterKickoff_isBadRequest() throws Exception {
        UpdateMatchRequest equal = SampleRequests.matchChange();
        equal.setEndsAt(CHANGED_KICKOFF);
        put(Actor.ADMIN, oneMatch(), equal)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(END_NOT_AFTER_KICKOFF));

        UpdateMatchRequest before = SampleRequests.matchChange();
        before.setEndsAt(CHANGED_KICKOFF.minusHours(1));
        put(Actor.ADMIN, oneMatch(), before)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(END_NOT_AFTER_KICKOFF));
    }

    // ---- responses ----

    @Test
    void existingMatchWithoutEndsAt_stillWorksEverywhere() throws Exception {
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endsAt").value(nullValue()));
        get(Actor.COACH_ALFA, "/api/matches", "teamId", String.valueOf(world.teamAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endsAt").value(nullValue()));
        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endsAt").value(nullValue()));
    }

    @Test
    void endsAt_showsInTeamListAndMySchedule() throws Exception {
        setFixtureEnd(LocalDateTime.of(2026, 12, 12, 16, 0));

        get(Actor.COACH_ALFA, "/api/matches", "teamId", String.valueOf(world.teamAlfaId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endsAt").value("2026-12-12T16:00:00"));
        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endsAt").value("2026-12-12T16:00:00"));
        get(Actor.PARENT_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].endsAt").value("2026-12-12T16:00:00"));
    }

    // ---- automatic freeze ----

    @Test
    void autoFreeze_withEndsAt_notAtSixHoursAfterEnd() throws Exception {
        // Ends 15:30 Swedish time (14:30 UTC). Limit is 20:30 UTC.
        setFixtureEnd(LocalDateTime.of(2026, 12, 12, 15, 30));
        moveClockTo(Instant.parse("2026-12-12T20:30:00Z"));

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
    }

    @Test
    void autoFreeze_withEndsAt_justAfterSixHoursAfterEnd() throws Exception {
        // Earlier than kickoff + 8 hours (21:00 UTC), so the end time decides.
        setFixtureEnd(LocalDateTime.of(2026, 12, 12, 15, 30));
        moveClockTo(Instant.parse("2026-12-12T20:31:00Z"));

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
    }

    @Test
    void autoFreeze_withLateEndsAt_staysOpenPastKickoffPlusEight() throws Exception {
        // Ends 17:00 Swedish time (16:00 UTC). Limit is 22:00 UTC, later than 21:00 UTC.
        setFixtureEnd(LocalDateTime.of(2026, 12, 12, 17, 0));
        moveClockTo(Instant.parse("2026-12-12T21:30:00Z"));

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));

        moveClockTo(Instant.parse("2026-12-12T22:01:00Z"));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
    }

    @Test
    void autoFreeze_withoutEndsAt_isUnchanged() throws Exception {
        Instant kickoffPlusEight = Instant.parse("2026-12-12T21:00:00Z");

        moveClockTo(kickoffPlusEight);
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));

        moveClockTo(kickoffPlusEight.plus(Duration.ofMinutes(1)));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
    }

    // ---- helpers ----

    private String oneMatch() {
        return "/api/matches/" + world.matchAlfaId();
    }

    private void setFixtureEnd(LocalDateTime endsAt) {
        Match match = matches.findById(world.matchAlfaId()).orElseThrow();
        match.setEndsAt(endsAt);
        matches.saveAndFlush(match);
    }
}
