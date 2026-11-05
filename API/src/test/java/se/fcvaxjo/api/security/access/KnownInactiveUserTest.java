package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Story S1-4, gap analysis point 4.
 * The JWT filter reads the database, so an old token for an inactive account
 * is rejected. GET /api/users/{id} still returns that row, so only those tests
 * stay tagged {@code known-gap}.
 */
class KnownInactiveUserTest extends ClubApiTest {

    @Test
    @DisplayName("S1-4: inaktiv token ska inte lista lag")
    void inactiveUser_cannotListTeamsWithOldToken() throws Exception {
        // The token is still signed. The filter rejects it because the account is inactive.
        get(Actor.INACTIVE_PLAYER, "/api/teams").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S1-4: inaktiv token ska inte lista användare")
    void inactiveUser_cannotListUsersWithOldToken() throws Exception {
        get(Actor.INACTIVE_PLAYER, "/api/users").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S1-4: inaktiv användare ska inte byta lösenord med gammal token")
    void inactiveUser_cannotChangePasswordWithOldToken() throws Exception {
        // The filter stops the request before change-password runs.
        post(Actor.INACTIVE_PLAYER, "/api/auth/change-password",
                SampleRequests.changeLogin(sharedLogin, rotatedLogin))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("S1-4: admin ska inte hämta en inaktiv spelare på den vanliga läsningen")
    void admin_cannotReadInactivePlayer() throws Exception {
        // The row stays in the database, but this GET should not hand it out.
        get(Actor.ADMIN, inactivePlayer()).andExpect(status().isNotFound());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("S1-4: tränare ska inte hämta en inaktiv spelare")
    void coach_cannotReadInactivePlayer() throws Exception {
        get(Actor.COACH_ALFA, inactivePlayer()).andExpect(status().isNotFound());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("S1-4: spelare ska inte hämta en inaktiv spelare")
    void player_cannotReadInactivePlayer() throws Exception {
        get(Actor.PLAYER_ALFA, inactivePlayer()).andExpect(status().isNotFound());
    }

    @Test
    @Tag("known-gap")
    @DisplayName("S1-4: förälder ska inte hämta en inaktiv spelare")
    void parent_cannotReadInactivePlayer() throws Exception {
        get(Actor.PARENT_ALFA, inactivePlayer()).andExpect(status().isNotFound());
    }

    private String inactivePlayer() {
        return "/api/users/" + world.inactivePlayerId();
    }
}
