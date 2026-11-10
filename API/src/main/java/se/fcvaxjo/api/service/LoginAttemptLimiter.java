package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import se.fcvaxjo.api.exception.TooManyRequestsException;

/**
 * Stops password guessing (issue #64).
 *
 * Counts failed logins per email and per IP. After {@link #MAX_FAILURES}
 * failures, that email or IP is locked for {@link #LOCK_TIME}, even with the right password.
 * A failure older than {@link #LOCK_TIME} is forgotten.
 *
 * The counts live in memory. They are lost on restart, and each API instance
 * has its own. That is fine for one small instance.
 */
@Service
public class LoginAttemptLimiter {

    public static final int MAX_FAILURES = 5;
    public static final Duration LOCK_TIME = Duration.ofMinutes(15);
    public static final String LOCKED_MESSAGE = "För många inloggningsförsök. Försök igen om 15 minuter.";

    /** How many failures in a row, and when they are forgotten (15 minutes after the latest one). */
    private record Failures(int count, Instant forgetAt) {
        boolean forgotten(Instant now) {
            return !now.isBefore(forgetAt);
        }
    }

    private final Map<String, Failures> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Throws 429 if this email or this IP is locked. Call before checking the password. */
    public void assertNotLocked(String email, String clientIp) {
        Instant now = clock.instant();
        if (isLocked(accountKey(email), now) || isLocked(ipKey(clientIp), now)) {
            throw new TooManyRequestsException(LOCKED_MESSAGE);
        }
    }

    /** Counts one failed login against both the email and the IP. */
    public void recordFailure(String email, String clientIp) {
        Instant now = clock.instant();
        // Drop old entries here, so the map does not grow forever.
        failures.values().removeIf(entry -> entry.forgotten(now));
        addFailure(accountKey(email), now);
        addFailure(ipKey(clientIp), now);
    }

    /** A correct password clears the count for that email. The IP count stays. */
    public void recordSuccess(String email) {
        failures.remove(accountKey(email));
    }

    /** Forgets everything. Used by tests, since memory is not rolled back like the database. */
    public void clear() {
        failures.clear();
    }

    private void addFailure(String key, Instant now) {
        failures.compute(key, (k, old) -> {
            int count = old == null || old.forgotten(now) ? 1 : old.count() + 1;
            return new Failures(count, now.plus(LOCK_TIME));
        });
    }

    private boolean isLocked(String key, Instant now) {
        Failures entry = failures.get(key);
        return entry != null && entry.count() >= MAX_FAILURES && !entry.forgotten(now);
    }

    /** Unknown emails are counted too, so the lockout does not reveal which emails exist. */
    private static String accountKey(String email) {
        return "account:" + email.trim().toLowerCase(Locale.ROOT);
    }

    private static String ipKey(String clientIp) {
        return "ip:" + clientIp;
    }
}
