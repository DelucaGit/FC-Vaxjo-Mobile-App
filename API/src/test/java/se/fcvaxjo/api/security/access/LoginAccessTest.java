package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/** Login, password change, and refresh. Contract: x-roles PUBLIC or ANY_AUTHENTICATED. */
class LoginAccessTest extends ClubApiTest {

    @Test
    void admin_canLogIn() throws Exception {
        assertOwnLogin(ClubFixture.EMAIL_ADMIN, "ADMIN");
    }

    @Test
    void chairman_canLogIn() throws Exception {
        // The role row is test data. Login only checks email and password, not a role allow-list.
        assertOwnLogin(ClubFixture.EMAIL_CHAIRMAN, "CHAIRMAN");
    }

    @Test
    void coach_canLogIn() throws Exception {
        assertOwnLogin(ClubFixture.EMAIL_COACH_ALFA, "COACH");
    }

    @Test
    void player_canLogIn() throws Exception {
        assertOwnLogin(ClubFixture.EMAIL_PLAYER_ALFA, "PLAYER");
    }

    @Test
    void parent_canLogIn() throws Exception {
        assertOwnLogin(ClubFixture.EMAIL_PARENT_ALFA, "PARENT");
    }

    @Test
    void wrongPassword_isRejected() throws Exception {
        // A failed login is 400, not 401. The contract documents that choice.
        post(Actor.ANON, "/api/auth/login",
                SampleRequests.login(ClubFixture.EMAIL_ADMIN, "not-the-shared-login"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void inactiveUser_cannotLogIn() throws Exception {
        // AuthService already blocks an inactive account at login (gap analysis point 4, this part).
        post(Actor.ANON, "/api/auth/login",
                SampleRequests.login(ClubFixture.EMAIL_INACTIVE, sharedLogin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("inactive")));
    }

    @Test
    void player_canChangeOwnPassword() throws Exception {
        // ANY_AUTHENTICATED, and the service changes only the user id inside the token.
        post(Actor.PLAYER_ALFA, "/api/auth/change-password",
                SampleRequests.changeLogin(sharedLogin, rotatedLogin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(ClubFixture.EMAIL_PLAYER_ALFA));
    }

    @Test
    void player_canRefreshToken() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/auth/refresh", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("PLAYER"))
                .andExpect(jsonPath("$.email").value(ClubFixture.EMAIL_PLAYER_ALFA));
    }

    @Test
    void inactiveUser_cannotRefresh() throws Exception {
        // The filter rejects the inactive account before refresh runs.
        // The body stays "Login required", same as any other protected call.
        post(Actor.INACTIVE_PLAYER, "/api/auth/refresh", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Login required"));
    }

    private void assertOwnLogin(String email, String roleName) throws Exception {
        // The response may contain this person's own email. It must not be someone else's.
        post(Actor.ANON, "/api/auth/login", SampleRequests.login(email, sharedLogin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value(roleName))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
