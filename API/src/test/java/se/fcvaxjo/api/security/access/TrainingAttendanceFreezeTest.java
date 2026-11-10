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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;
import se.fcvaxjo.api.support.TestClock;

/**
 * Issue #86: the attendance list follows the team while a training is open,
 * and is frozen by "Klar" or 6 hours after endsAt.
 *
 * The fixture training on team Alfa ends 2026-11-06 19:30 Swedish time (18:30 UTC),
 * so the 6-hour limit is 2026-11-07 00:30 UTC. The test clock starts on 2026-01-01,
 * so the training is open until a test moves the clock.
 * Team Alfa has playerAlfa (marked PRESENT), extra (not marked) and one inactive player.
 */
class TrainingAttendanceFreezeTest extends ClubApiTest {

    private static final Instant AUTO_FREEZE_LIMIT = Instant.parse("2026-11-07T00:30:00Z");

    @Autowired
    private TestClock clock;

    @Autowired
    private UserRepository users;

    @Autowired
    private RoleRepository roles;

    // ---- open training ----

    @Test
    void openTraining_listsActivePlayersOnTheTeamNow() throws Exception {
        get(Actor.COACH_ALFA, attendance())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].playerUserId").value(containsInAnyOrder(
                        (int) world.playerAlfaId(), (int) world.extraPlayerId())))
                .andExpect(jsonPath("$[?(@.playerUserId == " + world.playerAlfaId() + ")].status")
                        .value("PRESENT"));
    }

    @Test
    void newPlayer_showsOnOpenTraining_andCanBeMarked() throws Exception {
        AppUser newcomer = savePlayerOnTeam("Ny Spelare", world.teamAlfaId());

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(3)));

        put(Actor.COACH_ALFA, attendance() + "/" + newcomer.getId(), Map.of("status", "ABSENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ABSENT"));
    }

    @Test
    void playerWhoLeft_dropsOffOpenTraining() throws Exception {
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
    void lock_savesEveryoneOnTheList_andNewPlayerIsNotAddedAfterwards() throws Exception {
        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));

        savePlayerOnTeam("Kom senare", world.teamAlfaId());

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.playerUserId == " + world.extraPlayerId() + ")].status")
                        .value(hasItem(nullValue())));
    }

    @Test
    void playerWhoLeft_staysOnFrozenTraining() throws Exception {
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());

        moveToTeam(world.extraPlayerId(), world.teamBetaId());
        AppUser player = users.findById(world.playerAlfaId()).orElseThrow();
        player.setActive(false);
        users.saveAndFlush(player);

        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].playerUserId").value(containsInAnyOrder(
                        (int) world.playerAlfaId(), (int) world.extraPlayerId())));
    }

    @Test
    void lock_dropsOldRowsForPlayersNoLongerOnTheTeam() throws Exception {
        // playerAlfa has a saved row. After moving team, "Klar" must not keep it.
        moveToTeam(world.playerAlfaId(), world.teamBetaId());

        put(Actor.ADMIN, lock(), null).andExpect(status().isOk());

        get(Actor.ADMIN, attendance())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value((int) world.extraPlayerId()));
    }

    @Test
    void frozenTraining_rejectsMarking() throws Exception {
        put(Actor.COACH_ALFA, lock(), null).andExpect(status().isOk());

        put(Actor.COACH_ALFA, markExtra(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "The attendance list for this training is frozen and can no longer be changed"));
    }

    @Test
    void lock_twice_isNoChange() throws Exception {
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
    void admin_canLock() throws Exception {
        put(Actor.ADMIN, lock(), null).andExpect(status().isOk());
    }

    @Test
    void chairman_canLock() throws Exception {
        put(Actor.CHAIRMAN, lock(), null).andExpect(status().isOk());
    }

    @Test
    void coachFromOtherTeam_cannotLock() throws Exception {
        put(Actor.COACH_BETA, lock(), null).andExpect(status().isForbidden());
    }

    @Test
    void player_cannotLock() throws Exception {
        put(Actor.PLAYER_ALFA, lock(), null).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotLock() throws Exception {
        put(Actor.PARENT_ALFA, lock(), null).andExpect(status().isForbidden());
    }

    @Test
    void anonymous_cannotLock() throws Exception {
        put(Actor.ANON, lock(), null).andExpect(status().isUnauthorized());
    }

    // ---- automatic freeze ----

    @Test
    void autoFreeze_notAtTheLimit() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT);

        get(Actor.COACH_ALFA, oneTraining())
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
        put(Actor.COACH_ALFA, markExtra(), Map.of("status", "ABSENT"))
                .andExpect(status().isOk());
    }

    @Test
    void autoFreeze_afterTheLimit_keepsSavedRowsOnly() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofMinutes(1)));

        get(Actor.COACH_ALFA, oneTraining())
                .andExpect(jsonPath("$.attendanceLockedAt").value(notNullValue()));
        // Only playerAlfa had a saved row. Extra was never marked, so is not on the frozen list.
        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].playerUserId").value((int) world.playerAlfaId()))
                .andExpect(jsonPath("$[0].status").value("PRESENT"));
        put(Actor.COACH_ALFA, markExtra(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void autoFreeze_happensOnMarkingToo() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofHours(1)));

        put(Actor.COACH_ALFA, markExtra(), Map.of("status", "PRESENT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cancelledTraining_isNeverAutoFrozen_andCannotBeLocked() throws Exception {
        put(Actor.COACH_ALFA, oneTraining() + "/cancellation", SampleRequests.cancellation("Regn"))
                .andExpect(status().isOk());
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofDays(3)));

        get(Actor.COACH_ALFA, oneTraining())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.attendanceLockedAt").value(nullValue()));
        put(Actor.COACH_ALFA, lock(), null)
                .andExpect(status().isBadRequest());
    }

    // ---- player / parent schedule ----

    @Test
    void mySchedule_showsOpenTrainingWithOwnStatus() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PRESENT"))
                .andExpect(jsonPath("$[0].attendanceLockedAt").value(nullValue()));
    }

    @Test
    void mySchedule_autoFreezesTheSameWay() throws Exception {
        moveClockTo(AUTO_FREEZE_LIMIT.plus(Duration.ofMinutes(1)));

        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PRESENT"))
                .andExpect(jsonPath("$[0].attendanceLockedAt").value(notNullValue()));
        // The coach now sees the same frozen list.
        get(Actor.COACH_ALFA, attendance())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ---- helpers ----

    private String oneTraining() {
        return "/api/trainings/" + world.trainingAlfaId();
    }

    private String attendance() {
        return oneTraining() + "/attendance";
    }

    private String lock() {
        return attendance() + "/lock";
    }

    private String markExtra() {
        return attendance() + "/" + world.extraPlayerId();
    }

    private void moveClockTo(Instant target) {
        clock.advance(Duration.between(TestClock.START, target));
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
