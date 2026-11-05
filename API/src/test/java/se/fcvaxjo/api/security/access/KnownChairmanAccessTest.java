package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * ADR 0006 writes for the chairman.
 * Creating a team is already allowed and is tested in {@link TeamAccessTest}.
 * Creating, editing, and removing a player pass here, and so do linking and
 * unlinking a coach. Turning a player into a coach passes too (S1-8).
 * Those tests run in the normal suite.
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
    @DisplayName("ADR 0006: ordförande ska kunna byta roll, men inte till ADMIN")
    void chairman_canChangeNonAdminRole() throws Exception {
        // S1-8 lets the chairman turn a player into a coach. ADMIN and CHAIRMAN stay admin-only.
        put(Actor.CHAIRMAN, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("COACH"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADR 0006: ordförande ska kunna koppla en tränare till ett lag")
    void chairman_canAddCoach() throws Exception {
        post(Actor.CHAIRMAN, "/api/teams/" + world.teamAlfaId() + "/coaches",
                SampleRequests.coach(world.coachBetaId()))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("ADR 0006: ordförande ska kunna ta bort en tränare från ett lag")
    void chairman_canRemoveCoach() throws Exception {
        delete(Actor.CHAIRMAN, "/api/teams/" + world.teamBetaId() + "/coaches/" + world.coachBetaId())
                .andExpect(status().isNoContent());
    }
}
