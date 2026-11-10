package se.fcvaxjo.api.security.access;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;
import se.fcvaxjo.api.support.TestClock;

/**
 * Membership dates (#85): memberSince is set on create, memberUntil on soft delete.
 * ADMIN, CHAIRMAN and the team's COACH see them. PLAYER and PARENT do not.
 * The fixture saves its users straight to the database, so they have no dates.
 * They act as "old" users from before the columns existed.
 */
class MemberDatesAccessTest extends ClubApiTest {

    /** TestClock starts at 2026-01-01 12:00 UTC. The tests move it 10 days on. */
    private static final String TEN_DAYS_LATER = "2026-01-11";

    @Autowired
    private TestClock clock;

    @Autowired
    private UserRepository users;

    @Test
    void create_setsMemberSinceToTodayFromTheClock() throws Exception {
        clock.advance(Duration.ofDays(10));

        post(Actor.ADMIN, "/api/users", SampleRequests.newPlayer(
                "ny.medlem@example.test", "070-0000-0185", 85, world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberSince").value(TEN_DAYS_LATER))
                .andExpect(jsonPath("$.memberUntil").doesNotExist());
    }

    @Test
    void softDelete_setsMemberUntilToTodayFromTheClock() throws Exception {
        clock.advance(Duration.ofDays(10));

        delete(Actor.COACH_ALFA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isNoContent());

        AppUser removed = users.findById(world.extraPlayerId()).orElseThrow();
        assertEquals(LocalDate.parse(TEN_DAYS_LATER), removed.getMemberUntil());
    }

    @Test
    void oldUsersWithoutDates_stillWorkInListGetAndLogin() throws Exception {
        get(Actor.ADMIN, "/api/users")
                .andExpect(status().isOk());

        get(Actor.ADMIN, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberSince").doesNotExist())
                .andExpect(jsonPath("$.memberUntil").doesNotExist());

        post(Actor.ANON, "/api/auth/login", SampleRequests.login(ClubFixture.EMAIL_PLAYER_ALFA, sharedLogin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void adminChairmanAndOwnCoach_seeTheDates() throws Exception {
        giveAlfaPlayerDates();

        get(Actor.ADMIN, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberSince").value("2025-08-01"));

        get(Actor.CHAIRMAN, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberSince").value("2025-08-01"));

        get(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + world.playerAlfaId() + ")].memberSince")
                        .value("2025-08-01"));
    }

    @Test
    void player_doesNotSeeDatesOnOwnRow() throws Exception {
        giveAlfaPlayerDates();

        get(Actor.PLAYER_ALFA, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberSince").doesNotExist())
                .andExpect(jsonPath("$.memberUntil").doesNotExist());
    }

    @Test
    void parent_doesNotSeeDatesOnOwnRow() throws Exception {
        // A parent may not read the child's row at all (403), so the own row is the read to check.
        AppUser parent = users.findById(world.parentAlfaId()).orElseThrow();
        parent.setMemberSince(LocalDate.parse("2025-08-01"));
        users.save(parent);

        get(Actor.PARENT_ALFA, "/api/users/" + world.parentAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberSince").doesNotExist())
                .andExpect(jsonPath("$.memberUntil").doesNotExist());
    }

    private void giveAlfaPlayerDates() {
        AppUser player = users.findById(world.playerAlfaId()).orElseThrow();
        player.setMemberSince(LocalDate.parse("2025-08-01"));
        users.save(player);
    }
}
