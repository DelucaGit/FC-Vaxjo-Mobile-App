package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import se.fcvaxjo.api.service.LoginAttemptLimiter;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;
import se.fcvaxjo.api.support.TestClock;

/**
 * Issue #64: after 5 failed logins per account or per IP, login is blocked
 * for 15 minutes with 429. Each test sets its own IP, so the per-IP counter
 * only trips when a test means it to.
 */
class LoginRateLimitTest extends ClubApiTest {

    private static final String IP_A = "203.0.113.10";
    private static final String IP_B = "203.0.113.20";
    private static final String WRONG = "not-the-shared-login";

    @Autowired
    private TestClock clock;

    @Test
    void fiveFailures_thenSixthAttemptIsBlocked() throws Exception {
        failFiveTimes(ClubFixture.EMAIL_ADMIN, IP_A);

        login(ClubFixture.EMAIL_ADMIN, WRONG, IP_A)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(LoginAttemptLimiter.LOCKED_MESSAGE));
    }

    @Test
    void lockedAccount_isBlockedEvenWithTheRightPassword() throws Exception {
        failFiveTimes(ClubFixture.EMAIL_ADMIN, IP_A);

        // From another IP too: the account itself is locked, not just the IP.
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_B)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void lockLifts_after15Minutes() throws Exception {
        failFiveTimes(ClubFixture.EMAIL_ADMIN, IP_A);

        clock.advance(Duration.ofMinutes(14));
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isTooManyRequests());

        clock.advance(Duration.ofMinutes(1));
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isOk());
    }

    @Test
    void otherAccount_isNotAffected() throws Exception {
        failFiveTimes(ClubFixture.EMAIL_ADMIN, IP_A);

        login(ClubFixture.EMAIL_COACH_ALFA, sharedLogin, IP_B).andExpect(status().isOk());
    }

    @Test
    void successfulLogin_resetsTheAccountCounter() throws Exception {
        for (int i = 0; i < 4; i++) {
            login(ClubFixture.EMAIL_ADMIN, WRONG, IP_A).andExpect(status().isUnauthorized());
        }
        // Success from another IP, so only the account counter is in play.
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_B).andExpect(status().isOk());

        // Without the reset, the 5th failure below would lock the account and the login after it would be 429.
        for (int i = 0; i < 4; i++) {
            login(ClubFixture.EMAIL_ADMIN, WRONG, IP_B).andExpect(status().isUnauthorized());
        }
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_B).andExpect(status().isOk());
    }

    @Test
    void oneIp_tryingManyAccounts_isBlocked() throws Exception {
        String[] emails = {
                ClubFixture.EMAIL_ADMIN, ClubFixture.EMAIL_CHAIRMAN, ClubFixture.EMAIL_COACH_ALFA,
                ClubFixture.EMAIL_PLAYER_ALFA, ClubFixture.EMAIL_PARENT_ALFA };
        for (String email : emails) {
            login(email, WRONG, IP_A).andExpect(status().isUnauthorized());
        }

        login(ClubFixture.EMAIL_COACH_BETA, sharedLogin, IP_A)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void unknownEmail_countsLikeARealOne() throws Exception {
        // Otherwise the lockout would reveal which emails have an account.
        failFiveTimes("nobody@example.test", IP_A);

        login("nobody@example.test", WRONG, IP_B).andExpect(status().isTooManyRequests());
    }

    private void failFiveTimes(String email, String ip) throws Exception {
        for (int attempt = 1; attempt <= 5; attempt++) {
            login(email, WRONG, ip).andExpect(status().isUnauthorized());
        }
    }

    private ResultActions login(String email, String password, String ip) throws Exception {
        return mockMvc.perform(MockMvcRequestBuilders.post("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(SampleRequests.login(email, password))));
    }
}
