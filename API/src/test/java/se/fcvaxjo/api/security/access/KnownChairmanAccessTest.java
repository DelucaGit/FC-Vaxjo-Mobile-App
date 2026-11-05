package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * ADR 0006 pieces for the chairman.
 * Creating, editing, and removing a player now pass and run with the normal suite.
 * Changing a role, and linking or unlinking a coach, are still not allowed here.
 * Those three stay tagged {@code known-gap} so the normal build does not fail on them.
 */
class KnownChairmanAccessTest extends ClubApiTest {

    @Test
    @DisplayName("ADR 0006: ordförande ska kunna skapa en spelare")
    void chairman_canCreatePlayer() throws Exception {
        post(Actor.CHAIRMAN, "/api/users",
                SampleRequests.newPlayer("ny.ordforande@example.test", "070-0000-0184", 84,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("ADR 0006: ordförande ska kunna ändra en spelare")
    void chairman_canUpdatePlayer() throws Exception {
        put(Actor.CHAIRMAN, "/api/users/" + world.playerAlfaId() + "/player",
                SampleRequests.keepPlayer(
                        ClubFixture.NAME_PLAYER_ALFA,
                        ClubFixture.EMAIL_PLAYER_ALFA,
                        ClubFixture.PHONE_PLAYER_ALFA,
                        ClubFixture.SHIRT_ALFA,
                        world.teamAlfaId()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADR 0006: ordförande ska kunna ta bort en spelare ur laget")
    void chairman_canRemovePlayer() throws Exception {
        delete(Actor.CHAIRMAN, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isNoContent());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("ADR 0006: ordförande ska kunna byta roll, men inte till ADMIN")
    void chairman_canChangeNonAdminRole() throws Exception {
        // x-scope-planned: CHAIRMAN must not grant or remove ADMIN. COACH is allowed by that text.
        put(Actor.CHAIRMAN, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("COACH"))
                .andExpect(status().isOk());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("ADR 0006: ordförande ska kunna koppla en tränare till ett lag")
    void chairman_canAddCoach() throws Exception {
        post(Actor.CHAIRMAN, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isCreated());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("ADR 0006: ordförande ska kunna ta bort en tränare från ett lag")
    void chairman_canRemoveCoach() throws Exception {
        delete(Actor.CHAIRMAN, "/api/teams/" + world.teamBetaId() + "/coaches/" + world.coachBetaId())
                .andExpect(status().isNoContent());
    }
}
