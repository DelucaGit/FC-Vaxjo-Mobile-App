package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Story S1-4, gap analysis point 4, and story S1-13.
 * The JWT filter reads the database, so an old token for an inactive account
 * is rejected. GET of that row is 404 "User not found" for every role.
 * Those GET tests pass, so the known-gap tag is off, including the chairman
 * case from the extended role matrix. The callers are real active users
 * from {@link ClubFixture}.
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
    @DisplayName("S1-4: admin ska få 404 för en inaktiv spelare")
    void admin_cannotReadInactivePlayer() throws Exception {
        // The row stays in the database. This GET must not hand it out.
        expectInactiveHidden(Actor.ADMIN);
    }

    @Test
    @DisplayName("S1-4: ordförande ska få 404 för en inaktiv spelare")
    void chairman_cannotReadInactivePlayer() throws Exception {
        // Same rule as admin. There is no reactivate endpoint on this GET.
        expectInactiveHidden(Actor.CHAIRMAN);
    }

    @Test
    @DisplayName("S1-4: tränare ska inte hämta en inaktiv spelare")
    void coach_cannotReadInactivePlayer() throws Exception {
        // Alfa's coach trains the inactive player's team. The row is still hidden.
        expectInactiveHidden(Actor.COACH_ALFA);
    }

    @Test
    @DisplayName("S1-4: spelare ska få 404 för en inaktiv spelare")
    void player_cannotReadInactivePlayer() throws Exception {
        // A player normally gets 403 for someone else's id. An inactive row is 404 first.
        expectInactiveHidden(Actor.PLAYER_ALFA);
    }

    @Test
    @DisplayName("S1-4: förälder ska inte hämta en inaktiv spelare")
    void parent_cannotReadInactivePlayer() throws Exception {
        expectInactiveHidden(Actor.PARENT_ALFA);
    }

    @Test
    @DisplayName("S1-13: inaktiv spelare syns inte i listor eller sök")
    void inactivePlayer_isHiddenFromListsAndSearch() throws Exception {
        // These queries already kept active=true. This test locks that.
        assertBodyHides(
                get(Actor.ADMIN, "/api/users").andExpect(status().isOk()),
                ClubFixture.EMAIL_INACTIVE,
                ClubFixture.PHONE_INACTIVE);
        assertBodyHides(
                get(Actor.ADMIN, "/api/users/search", "name", "Inaktiv").andExpect(status().isOk()),
                ClubFixture.EMAIL_INACTIVE);
        get(Actor.ADMIN, "/api/users/search", "phone", ClubFixture.PHONE_INACTIVE)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
        get(Actor.ADMIN, "/api/users/search", "number", "44")
                .andExpect(status().isNotFound());
        assertBodyHides(
                get(Actor.ADMIN, "/api/teams/" + world.teamAlfaId() + "/players")
                        .andExpect(status().isOk()),
                ClubFixture.EMAIL_INACTIVE);
    }

    private void expectInactiveHidden(Actor actor) throws Exception {
        // Same sentence as a missing id. The word "inactive" would show the account exists.
        get(actor, "/api/users/" + world.inactivePlayerId())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }
}
