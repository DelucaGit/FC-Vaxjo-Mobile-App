package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import se.fcvaxjo.api.service.LoginAttemptLimiter;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;
import se.fcvaxjo.api.support.TestClock;

/**
 * Issue #64, ADR 0008: login lockout over HTTP.
 * 5 failures per email + IP, 20 per email from any IP, 30 per IP; each locks for 15 minutes with 429.
 * The IPs are public test addresses (203.0.113.x, 198.51.100.x), so the internal-IP fallback stays off
 * unless a test means it. MockMvc does not run Tomcat valves; see LoginClientIpServerTest for that.
 */
class LoginRateLimitTest extends ClubApiTest {

    private static final String IP_A = "203.0.113.10";
    private static final String IP_B = "203.0.113.20";
    private static final String WRONG = "not-the-shared-login";

    @Autowired
    private TestClock clock;

    @Test
    void fiveFailures_thenSixthAttemptFromSameEmailAndIpIsBlocked() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);

        login(ClubFixture.EMAIL_ADMIN, WRONG, IP_A)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(LoginAttemptLimiter.LOCKED_MESSAGE));
    }

    @Test
    void lockedRequest_isBlockedEvenWithTheRightPassword() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);

        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isTooManyRequests());
    }

    @Test
    void sameEmailFromAnotherIp_isAllowedUntilTwenty() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);
        // 5 + 4 + 10 = 19 failures for the email, from 12 IPs. Each IP stays under 5.
        fail(ClubFixture.EMAIL_ADMIN, IP_B, 4);
        for (int i = 1; i <= 10; i++) {
            fail(ClubFixture.EMAIL_ADMIN, "198.51.100." + i, 1);
        }
        // Failure 20 is still counted normally (401).
        login(ClubFixture.EMAIL_ADMIN, WRONG, "198.51.100.50").andExpect(status().isUnauthorized());

        // Now 20: the email is locked from every IP.
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, "198.51.100.99").andExpect(status().isTooManyRequests());
    }

    @Test
    void oneIp_sprayingManyEmails_isBlockedAtThirty() throws Exception {
        for (int i = 1; i <= 30; i++) {
            login("spray" + i + "@example.test", WRONG, IP_A).andExpect(status().isUnauthorized());
        }

        login(ClubFixture.EMAIL_COACH_BETA, sharedLogin, IP_A).andExpect(status().isTooManyRequests());
        // Another IP is not affected.
        login(ClubFixture.EMAIL_COACH_BETA, sharedLogin, IP_B).andExpect(status().isOk());
    }

    @Test
    void lockLifts_after15Minutes() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);

        clock.advance(Duration.ofMinutes(14));
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isTooManyRequests());

        clock.advance(Duration.ofMinutes(1));
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isOk());
    }

    @Test
    void otherAccount_onAnotherIp_isNotAffected() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);

        login(ClubFixture.EMAIL_COACH_ALFA, sharedLogin, IP_B).andExpect(status().isOk());
    }

    @Test
    void successfulLogin_resetsTheEmailAndIpCounter() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 4);
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isOk());

        // Without the reset, the 5th failure below would lock and the login after it would be 429.
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 4);
        login(ClubFixture.EMAIL_ADMIN, sharedLogin, IP_A).andExpect(status().isOk());
    }

    @Test
    void unknownEmail_countsLikeARealOne() throws Exception {
        // Otherwise the lockout would reveal which emails have an account.
        fail("nobody@example.test", IP_A, 5);

        login("nobody@example.test", WRONG, IP_A).andExpect(status().isTooManyRequests());
    }

    @Test
    void lockedResponse_doesNotContainTheIp() throws Exception {
        fail(ClubFixture.EMAIL_ADMIN, IP_A, 5);

        ResultActions locked = login(ClubFixture.EMAIL_ADMIN, WRONG, IP_A).andExpect(status().isTooManyRequests());
        assertBodyHides(locked, IP_A, "203.0.113");
    }

    @Test
    void fakedForwardedHeaders_areIgnored() throws Exception {
        // MockMvc's own address is 127.0.0.1 (internal), so the email-only fallback applies.
        // If the controller trusted the headers, each attempt would look like a new IP and never lock.
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(loginRequest(ClubFixture.EMAIL_ADMIN, WRONG)
                    .header("X-Real-IP", "203.0.113." + i)
                    .header("X-Forwarded-For", "198.51.100." + i))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(loginRequest(ClubFixture.EMAIL_ADMIN, sharedLogin)
                .header("X-Real-IP", "203.0.113.99")
                .header("X-Forwarded-For", "198.51.100.99"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void internalIp_fallback_locksTheEmailAfterFive_butNotOtherAccounts() throws Exception {
        // Behind a proxy that was not set up right, everyone shares one internal IP.
        String proxy = "100.64.0.3";
        fail(ClubFixture.EMAIL_ADMIN, proxy, 5);

        login(ClubFixture.EMAIL_ADMIN, sharedLogin, proxy).andExpect(status().isTooManyRequests());
        login(ClubFixture.EMAIL_COACH_ALFA, sharedLogin, proxy).andExpect(status().isOk());
    }

    private void fail(String email, String ip, int times) throws Exception {
        for (int attempt = 1; attempt <= times; attempt++) {
            login(email, WRONG, ip).andExpect(status().isUnauthorized());
        }
    }

    private ResultActions login(String email, String password, String ip) throws Exception {
        return mockMvc.perform(loginRequest(email, password).with(request -> {
            request.setRemoteAddr(ip);
            return request;
        }));
    }

    private MockHttpServletRequestBuilder loginRequest(String email, String password) throws Exception {
        return MockMvcRequestBuilders.post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(SampleRequests.login(email, password)));
    }
}
