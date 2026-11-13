package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.TestClock;

/**
 * Issue #67: match attendance, with the same freeze rule as trainings (ADR 0010).
 * The list follows the team while the match is open, and is frozen by "Klar"
 * or 8 hours after kickoffAt.
 *
 * The fixture match on team Alfa kicks off 2026-12-12 14:00 Swedish time (13:00 UTC),
 * so the 8-hour limit is 2026-12-12 21:00 UTC. Attendance opens 30 minutes before
 * kickoff (issue #124), so each test starts with the clock at kickoff.
 * Team Alfa has playerAlfa and extra (both active, neither marked) and one inactive player.
 */
class MatchAttendanceFreezeTest extends ClubApiTest {

    private static final Instant AUTO_FREEZE_LIMIT = Instant.parse("2026-12-12T21:00:00Z");

    private static final String NOT_OPEN = "Närvaron öppnar 30 minuter före start.";

    @Autowired
    private TestClock clock;

    @Autowired
    private UserRepository users;

    @Autowired
    private RoleRepository roles;

    /** Attendance only opens 30 minutes before start (issue #124), so most tests start at start time. */
    @BeforeEach
    void startAtStartTime() {
        moveClockTo(FIXTURE_MATCH_KICKOFF);
    }

    // ---- attendance window (issue #124) ----

    @Test
    void window_31MinutesBeforeKickoff_rejectsMarkingAndLock() throws Exception {
        moveClockTo(FIXTURE_MATCH_KICKOFF.minus(Duration.ofMinutes(31)));

        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(NOT_OPEN));
        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(NOT_OPEN));
    }

    @Test
    void window_30MinutesBeforeKickoff_allowsMarkingAndLock() throws Exception {
        moveClockTo(FIXTURE_MATCH_KICKOFF.minus(Duration.ofMinutes(30)));

        markBoth();
        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
    }

    @Test
    void window_duringMatch_allowsMarkingAndLock() throws Exception {
        moveClockTo(FIXTURE_MATCH_KICKOFF.plus(Duration.ofMinutes(60)));

        markBoth();
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());
    }

    @Test
    void window_atAutoFreezeLimit_stillAllowsMarkingAndLock() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT);

        markBoth();
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());
    }

    // ---- roles and team scope ----

    @Test
    void staffOfTheTeam_canReadAndMark() throws Exception {
        for (Actor actor : new Actor[] { Actor.ADMIN, Actor.CHAIRMAN, Actor.COACH_ALFA }) {
            get(actor, attendance()).andExpect(status().isOk());
            put(actor, markPlayer(), Map.of("status", "PRESENT"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.playerUserId").value((int) world.playerAlfaId()))
                    .andExpect(jsonPath("$.status").value("PRESENT"));
        }
    }

    @Test
    void coachFromOtherTeam_playerAndParent_areForbidden() throws Exception {
        for (Actor actor : new Actor[] { Actor.COACH_BETA, Actor.PLAYER_ALFA, Actor.PARENT_ALFA }) {
            get(actor, attendance()).andExpect(status().isForbidden());
            put(actor, markPlayer(), Map.of("status", "PRESENT")).andExpect(status().isForbidden());
            put(actor, lock(), null).andExpect(status().isForbidden());
        }
    }

    @Test
    void anonymous_isUnauthorized() throws Exception {
        get(Actor.ANON, attendance()).andExpect(status().isUnauthorized());
        put(Actor.ANON, markPlayer(), Map.of("status", "PRESENT")).andExpect(status().isUnauthorized());
        put(Actor.ANON, lock(), null).andExpect(status().isUnauthorized());
    }

    @Test
    void unknownMatch_isNotFoundForAdmin() throws Exception {
        get(Actor.ADMIN, "/api/matches/999999/attendance").andExpect(status().isNotFound());
        put(Actor.ADMIN, "/api/matches/999999/attendance/lock", null).andExpect(status().isNotFound());
    }

    @Test
    void badStatus_isRejected() throws Exception {
        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "MAYBE"))
                .andExpect(status().isBadRequest());
    }

    // ---- open match ----

    @Test
    void openMatch_listsActivePlayersOnTheTeamNow_unmarkedAsNull() throws Exception {
        get(Actor.COACH_ALFA, attendance())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].playerUserId").value(containsInAnyOrder(
                        (int) world.playerAlfaId(), (int) world.extraPlayerId())))
                .andExpect(jsonPath("$[0].status").value(nullValue()));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
    }

    @Test
    void newPlayer_showsOnOpenMatch_andCanBeMarked() throws Exception {
        AppUser newcomer = savePlayerOnTeam("Ny Spelare", world.teamAlfaId());

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(3)));
        put(Actor.COACH_ALFA, attendance() + "/" + newcomer.getId(), Map.of("status", "ABSENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ABSENT"));
    }

    @Test
    void playerWhoLeft_dropsOffOpenMatch_evenIfMarked() throws Exception {
        markBoth();
        moveToTeam(world.extraPlayerId(), world.teamBetaId());

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value((int) world.playerAlfaId()));
    }

    @Test
    void markingPlayerFromAnotherTeamOrInactive_isRejected() throws Exception {
        put(Actor.COACH_ALFA, attendance() + "/" + world.playerBetaId(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest());
        put(Actor.COACH_ALFA, attendance() + "/" + world.inactivePlayerId(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest());
    }

    // ---- "Klar" ----

    @Test
    void lock_withUnmarkedPlayer_isRejected_andListStaysOpen() throws Exception {
        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT")).andExpect(status().isOk());

        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "All players must be marked before the attendance list can be frozen"));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
    }

    @Test
    void lock_afterEveryoneIsMarked_freezes() throws Exception {
        markBoth();

        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value((int) world.matchAlfaId()))
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
    }

    @Test
    void lock_byAdminAndChairman_isAllowed() throws Exception {
        markBoth();
        put(Actor.ADMIN, lock(), null).andExpect(status().isOk());
        put(Actor.CHAIRMAN, lock(), null).andExpect(status().isOk());
    }

    @Test
    void lock_teamWithNoPlayers_freezes() throws Exception {
        moveToTeam(world.playerAlfaId(), world.teamBetaId());
        moveToTeam(world.extraPlayerId(), world.teamBetaId());

        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void lock_twice_isNoChange() throws Exception {
        markBoth();
        String first = put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        clock.advance(Duration.ofMinutes(5));
        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceLockedAt").value(
                        (String) JsonPath.read(first, "$.attendanceLockedAt")));
    }

    @Test
    void frozenList_keepsPlayerWhoLeft_andHidesNewPlayer() throws Exception {
        markBoth();
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());

        moveToTeam(world.extraPlayerId(), world.teamBetaId());
        AppUser player = users.findById(world.playerAlfaId()).orElseThrow();
        player.setActive(false);
        users.saveAndFlush(player);
        savePlayerOnTeam("Kom senare", world.teamAlfaId());

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].playerUserId").value(containsInAnyOrder(
                        (int) world.playerAlfaId(), (int) world.extraPlayerId())))
                .andExpect(jsonPath("$[?(@.playerUserId == " + world.playerAlfaId() + ")].playerName")
                        .value(hasItem(notNullValue())));
    }

    @Test
    void frozenMatch_rejectsMarking() throws Exception {
        markBoth();
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());

        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "ABSENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "The attendance list for this match is frozen and can no longer be changed"));
    }

    // ---- automatic freeze ----

    @Test
    void autoFreeze_notAtTheLimit() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT);

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT"))
                .andExpect(status().isOk());
    }

    @Test
    void autoFreeze_afterTheLimit_keepsSavedRowsOnly() throws Exception {
        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT")).andExpect(status().isOk());
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofMinutes(1)));

        get(Actor.COACH_ALFA, oneMatch())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
        // Extra was never marked, so extra is not on the frozen list.
        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value((int) world.playerAlfaId()))
                .andExpect(jsonPath("$[0].status").value("PRESENT"));
        put(Actor.COACH_ALFA, attendance() + "/" + world.extraPlayerId(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void autoFreeze_showsInTeamListAndMySchedule() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofHours(1)));

        get(Actor.COACH_ALFA, "/api/matches", "teamId", String.valueOf(world.teamAlfaId()))
                .andExpect(jsonPath("$[0].attendanceLockedAt").value(notNullValue()));
        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attendanceLockedAt").value(notNullValue()));
    }

    @Test
    void mySchedule_showsOpenMatch() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/matches")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attendanceLockedAt").value(nullValue()));
    }

    // ---- helpers ----

    private String oneMatch() {
        return "/api/matches/" + world.matchAlfaId();
    }

    private String attendance() {
        return oneMatch() + "/attendance";
    }

    private String lock() {
        return attendance() + "/lock";
    }

    private String markPlayer() {
        return attendance() + "/" + world.playerAlfaId();
    }

    private void markBoth() throws Exception {
        put(Actor.COACH_ALFA, markPlayer(), Map.of("status", "PRESENT")).andExpect(status().isOk());
        put(Actor.COACH_ALFA, attendance() + "/" + world.extraPlayerId(), Map.of("status", "ABSENT"))
                .andExpect(status().isOk());
    }


    private void moveToTeam(long userId, long teamId) {
        AppUser user = users.findById(userId).orElseThrow();
        user.setTeamId(teamId);
        users.saveAndFlush(user);
    }

    private AppUser savePlayerOnTeam(String name, long teamId) {
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(name.replace(' ', '.').toLowerCase() + "@example.test");
        user.setRoleId(roles.findByName("PLAYER").orElseThrow().getId());
        user.setTeamId(teamId);
        user.setActive(true);
        user.setMustChangePassword(false);
        return users.saveAndFlush(user);
    }
}
