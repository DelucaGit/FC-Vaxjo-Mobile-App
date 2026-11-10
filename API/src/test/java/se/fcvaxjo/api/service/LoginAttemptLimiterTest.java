package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static se.fcvaxjo.api.service.LoginAttemptLimiter.MAX_FAILURES_EMAIL;
import static se.fcvaxjo.api.service.LoginAttemptLimiter.MAX_FAILURES_EMAIL_AND_IP;
import static se.fcvaxjo.api.service.LoginAttemptLimiter.MAX_FAILURES_IP;

import java.time.Duration;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.exception.TooManyRequestsException;
import se.fcvaxjo.api.support.TestClock;

/** The three lockout rules, expiry, success reset and the internal-IP fallback (issue #64, ADR 0008). */
class LoginAttemptLimiterTest {

    private static final String EMAIL = "anna@example.test";
    private static final String IP_A = "203.0.113.5";
    private static final String IP_B = "198.51.100.7";
    private static final String PROXY_IP = "100.64.0.3";

    private final TestClock clock = new TestClock();
    private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(clock, new ClientIpPrivacy());

    @Test
    void emailAndIp_locksAfterFive() {
        fail(EMAIL, IP_A, MAX_FAILURES_EMAIL_AND_IP - 1);
        assertOpen(EMAIL, IP_A);

        fail(EMAIL, IP_A, 1);
        assertLocked(EMAIL, IP_A);
        // Same email from another IP is still open: the email-only rule needs 20.
        assertOpen(EMAIL, IP_B);
        // Same IP, another email is still open: the IP-only rule needs 30.
        assertOpen("other@example.test", IP_A);
    }

    @Test
    void email_locksAfterTwentyFromManyIps() {
        for (int i = 1; i < MAX_FAILURES_EMAIL; i++) {
            fail(EMAIL, "203.0.113." + i, 1);
        }
        assertOpen(EMAIL, "198.51.100.200");

        fail(EMAIL, "203.0.113.250", 1);
        assertLocked(EMAIL, "198.51.100.200");
    }

    @Test
    void ip_locksAfterThirtyAcrossManyEmails() {
        for (int i = 1; i < MAX_FAILURES_IP; i++) {
            fail("user" + i + "@example.test", IP_A, 1);
        }
        assertOpen("fresh@example.test", IP_A);

        fail("user30@example.test", IP_A, 1);
        assertLocked("fresh@example.test", IP_A);
        assertOpen("fresh@example.test", IP_B);
    }

    @Test
    void failuresAreForgotten15MinutesAfterTheLatest() {
        fail(EMAIL, IP_A, MAX_FAILURES_EMAIL_AND_IP);

        clock.advance(Duration.ofMinutes(14));
        assertLocked(EMAIL, IP_A);

        clock.advance(Duration.ofMinutes(1));
        assertOpen(EMAIL, IP_A);
        // The count started over, so one new failure does not lock again.
        fail(EMAIL, IP_A, 1);
        assertOpen(EMAIL, IP_A);
    }

    @Test
    void success_clearsEmailAndIpAndEmailCounters_butNotTheIpCounter() {
        fail(EMAIL, IP_A, MAX_FAILURES_EMAIL_AND_IP - 1);
        // 4 + 24 = 28 failures on this IP.
        for (int i = 0; i < MAX_FAILURES_IP - MAX_FAILURES_EMAIL_AND_IP - 1; i++) {
            fail("other" + i + "@example.test", IP_A, 1);
        }
        limiter.recordSuccess(EMAIL, IP_A);

        // Without the reset this failure would be number 5 for email + IP.
        fail(EMAIL, IP_A, 1);
        assertOpen(EMAIL, IP_A);
        // The IP counter was not reset (now 29): one more failure makes 30 and locks the IP.
        fail("last@example.test", IP_A, 1);
        assertLocked("fresh@example.test", IP_A);
    }

    @Test
    void emailIsCaseAndSpaceInsensitive() {
        fail(" Anna@Example.TEST ", IP_A, MAX_FAILURES_EMAIL_AND_IP);
        assertLocked(EMAIL, IP_A);
    }

    @Test
    void internalIp_fallsBackToEmailOnlyAtFive() {
        fail(EMAIL, PROXY_IP, MAX_FAILURES_EMAIL_AND_IP);

        // Locked from any address: the email alone is the key now.
        assertLocked(EMAIL, PROXY_IP);
        assertLocked(EMAIL, "10.0.0.8");
        // Everyone shares the proxy IP, so other accounts must stay open (no IP rule).
        for (int i = 0; i < MAX_FAILURES_IP; i++) {
            fail("user" + i + "@example.test", PROXY_IP, 1);
        }
        assertOpen("fresh@example.test", PROXY_IP);
    }

    @Test
    void internalIp_warningIsLoggedOncePerHour() {
        for (int i = 0; i < 50; i++) {
            fail("user" + i + "@example.test", "127.0.0.1", 1);
        }
        assertEquals(1, limiter.fallbackWarningsLogged());

        clock.advance(Duration.ofHours(1));
        fail(EMAIL, "127.0.0.1", 1);
        assertEquals(2, limiter.fallbackWarningsLogged());
    }

    @Test
    void publicIp_logsNoWarning() {
        fail(EMAIL, IP_A, 3);
        assertEquals(0, limiter.fallbackWarningsLogged());
    }

    @Test
    void internalRanges() {
        for (String ip : new String[] { "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
                "100.64.0.1", "100.127.255.255", "127.0.0.1", "169.254.1.1", "::1", "fc00::1", "fd12::1",
                "fe80::1", "", "not-an-ip", null }) {
            assertTrue(ClientIpPrivacy.isInternal(ip), ip);
        }
        for (String ip : new String[] { "203.0.113.5", "172.32.0.1", "100.128.0.1", "8.8.8.8",
                "2001:db8::1" }) {
            assertFalse(ClientIpPrivacy.isInternal(ip), ip);
        }
    }

    @Test
    void truncateHidesTheLastPart() {
        assertEquals("203.0.113.0/24", ClientIpPrivacy.truncate("203.0.113.57"));
        assertEquals("2001:0db8:abcd::/48", ClientIpPrivacy.truncate("2001:db8:abcd:12::1"));
        assertEquals("unknown", ClientIpPrivacy.truncate("evil.example.com"));
    }

    @Test
    void hashIsStableButNotTheIp() {
        ClientIpPrivacy privacy = new ClientIpPrivacy();
        assertEquals(privacy.hash(IP_A), privacy.hash(IP_A));
        assertEquals(64, privacy.hash(IP_A).length());
        // A new key at each startup, so hashes from one run say nothing in the next.
        assertFalse(privacy.hash(IP_A).equals(new ClientIpPrivacy().hash(IP_A)));
    }

    private void fail(String email, String ip, int times) {
        for (int i = 0; i < times; i++) {
            limiter.recordFailure(email, ip);
        }
    }

    private void assertLocked(String email, String ip) {
        assertThrows(TooManyRequestsException.class, () -> limiter.assertNotLocked(email, ip));
    }

    private void assertOpen(String email, String ip) {
        assertDoesNotThrow(() -> limiter.assertNotLocked(email, ip));
    }
}
