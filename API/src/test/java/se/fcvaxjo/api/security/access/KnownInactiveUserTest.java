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
 * Story S1-4, gap analysis point 4, and story S1-13, updated by F3.
 * The JWT filter reads the database, so an old token for an inactive account
 * is rejected. ADMIN and CHAIRMAN still get 404 "User not found" for that row.
 * PLAYER, PARENT and COACH get the same 403 as a missing id, so the status
 * code does not say the row exists. The Architect decided that in F3.
 * The callers are real active users from {@link ClubFixture}.
 */
class KnownInactiveUserTest extends ClubApiTest {

    private static final long MISSING_USER_ID = 9_000_000L;
    private static final String COACH_CANNOT_READ =
            "You can only read users on a team you train";
    private static final String OWN_RECORD_ONLY =
            "You can only read your own user record";

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
    @DisplayName("F3: tränare i laget ska få 403 för en inaktiv spelare")
    void coachOnTheTeam_cannotTellAnInactivePlayerFromAMissingId() throws Exception {
        // Alfa's coach trains this team, so an active row would be 200.
        // An inactive row must look like a missing id: 403, not 404.
        expectHiddenLikeAMissingId(Actor.COACH_ALFA, COACH_CANNOT_READ);
    }

    @Test
    @DisplayName("F3: tränare i ett annat lag ska få 403 för en inaktiv spelare")
    void coachOnAnotherTeam_cannotTellAnInactivePlayerFromAMissingId() throws Exception {
        expectHiddenLikeAMissingId(Actor.COACH_BETA, COACH_CANNOT_READ);
    }

    @Test
    @DisplayName("F3: spelare ska få 403 för en inaktiv spelare")
    void player_cannotTellAnInactivePlayerFromAMissingId() throws Exception {
        expectHiddenLikeAMissingId(Actor.PLAYER_ALFA, OWN_RECORD_ONLY);
    }

    @Test
    @DisplayName("F3: förälder ska få 403 för en inaktiv spelare")
    void parent_cannotTellAnInactivePlayerFromAMissingId() throws Exception {
        expectHiddenLikeAMissingId(Actor.PARENT_ALFA, OWN_RECORD_ONLY);
    }

    @Test
    @DisplayName("F3: förälder ska få 403 för ett id som inte finns")
    void parent_missingUser_isForbidden() throws Exception {
        expectMissingId(Actor.PARENT_ALFA, OWN_RECORD_ONLY);
    }

    @Test
    @DisplayName("F3: tränare ska få 403 för ett id som inte finns")
    void coach_missingUser_isForbidden() throws Exception {
        expectMissingId(Actor.COACH_ALFA, COACH_CANNOT_READ);
    }

    @Test
    @DisplayName("F3: ordförande ska få 404 för ett id som inte finns")
    void chairman_missingUser_isNotFound() throws Exception {
        get(Actor.CHAIRMAN, "/api/users/" + MISSING_USER_ID)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
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
                post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByName("Inaktiv")).andExpect(status().isOk()),
                ClubFixture.EMAIL_INACTIVE);
        post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByPhone(ClubFixture.PHONE_INACTIVE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
        post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByShirt(44))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
        var missingShirt = post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByShirt(99))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
        assertBodyHides(missingShirt, "99");
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

    private void expectHiddenLikeAMissingId(Actor actor, String message) throws Exception {
        var response = get(actor, "/api/users/" + world.inactivePlayerId())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(message));
        assertBodyHides(response, "inactive", "Inactive",
                ClubFixture.EMAIL_INACTIVE, ClubFixture.PHONE_INACTIVE);
    }

    private void expectMissingId(Actor actor, String message) throws Exception {
        get(actor, "/api/users/" + MISSING_USER_ID)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(message));
    }
}
