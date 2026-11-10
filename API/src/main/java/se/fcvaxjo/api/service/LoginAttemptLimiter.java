package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import se.fcvaxjo.api.exception.TooManyRequestsException;

/**
 * Stops password guessing (issue #64, ADR 0008).
 *
 * Three counters, each locks for {@link #LOCK_TIME}:
 * <ul>
 * <li>email + IP: {@link #MAX_FAILURES_EMAIL_AND_IP} failures. The main rule: one phone guessing one account.</li>
 * <li>IP: {@link #MAX_FAILURES_IP} failures. One phone trying many accounts.</li>
 * <li>email: {@link #MAX_FAILURES_EMAIL} failures from any IPs. Many phones guessing one account.</li>
 * </ul>
 * A locked request gets 429 even with the right password. A failure is forgotten {@link #LOCK_TIME}
 * after the latest one. A success clears the email + IP and the email counters (not the IP counter).
 *
 * <p><b>Fallback.</b> If the IP is internal (private, loopback, 100.64/10 ...), it is the proxy's address and
 * not the phone's, so the forwarded-header setup did not work. Then every user would share one IP and the IP
 * rules could lock out the whole club. So we skip the IP counters and lock on the email alone after
 * {@link #MAX_FAILURES_EMAIL_AND_IP} failures: as strict as the main rule, without the shared IP.
 * A warning is logged at most once per {@link #FALLBACK_WARNING_INTERVAL}.
 *
 * <p><b>Privacy.</b> IPs are stored only as HMAC hashes ({@link ClientIpPrivacy}) and logged only truncated.
 *
 * The counts live in memory. They are lost on restart, and each API instance has its own.
 * That is fine for one small instance; see issue #77 for the move to PostgreSQL.
 */
@Service
public class LoginAttemptLimiter {

    public static final int MAX_FAILURES_EMAIL_AND_IP = 5;
    public static final int MAX_FAILURES_IP = 30;
    public static final int MAX_FAILURES_EMAIL = 20;
    public static final Duration LOCK_TIME = Duration.ofMinutes(15);
    public static final Duration FALLBACK_WARNING_INTERVAL = Duration.ofHours(1);
    public static final String LOCKED_MESSAGE = "För många inloggningsförsök. Försök igen om 15 minuter.";

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptLimiter.class);

    /** How many failures in a row, and when they are forgotten (15 minutes after the latest one). */
    private record Failures(int count, Instant forgetAt) {
        boolean forgotten(Instant now) {
            return !now.isBefore(forgetAt);
        }
    }

    private final Map<String, Failures> failures = new ConcurrentHashMap<>();
    private final Clock clock;
    private final ClientIpPrivacy ipPrivacy;
    private final AtomicReference<Instant> lastFallbackWarning = new AtomicReference<>();
    private final AtomicInteger fallbackWarnings = new AtomicInteger();

    public LoginAttemptLimiter(Clock clock, ClientIpPrivacy ipPrivacy) {
        this.clock = clock;
        this.ipPrivacy = ipPrivacy;
    }

    /** Throws 429 if any counter for this email and IP is locked. Call before checking the password. */
    public void assertNotLocked(String email, String clientIp) {
        Instant now = clock.instant();
        boolean locked;
        if (ipIsUsable(clientIp, now)) {
            String ipHash = ipPrivacy.hash(clientIp);
            locked = isLocked(emailAndIpKey(email, ipHash), MAX_FAILURES_EMAIL_AND_IP, now)
                    || isLocked(ipKey(ipHash), MAX_FAILURES_IP, now)
                    || isLocked(emailKey(email), MAX_FAILURES_EMAIL, now);
        } else {
            locked = isLocked(emailKey(email), MAX_FAILURES_EMAIL_AND_IP, now);
        }
        if (locked) {
            throw new TooManyRequestsException(LOCKED_MESSAGE);
        }
    }

    /** Counts one failed login. */
    public void recordFailure(String email, String clientIp) {
        Instant now = clock.instant();
        // Drop old entries here, so the map does not grow forever.
        failures.values().removeIf(entry -> entry.forgotten(now));
        addFailure(emailKey(email), now);
        if (ipIsUsable(clientIp, now)) {
            String ipHash = ipPrivacy.hash(clientIp);
            addFailure(emailAndIpKey(email, ipHash), now);
            addFailure(ipKey(ipHash), now);
        }
    }

    /**
     * A correct password clears the email + IP and the email counters.
     * The IP counter stays, so knowing one password does not reset a spray across other accounts.
     */
    public void recordSuccess(String email, String clientIp) {
        failures.remove(emailKey(email));
        failures.remove(emailAndIpKey(email, ipPrivacy.hash(clientIp)));
    }

    /** Forgets everything. Used by tests, since memory is not rolled back like the database. */
    public void clear() {
        failures.clear();
        lastFallbackWarning.set(null);
        fallbackWarnings.set(0);
    }

    /** How many fallback warnings have been logged. Lets tests check the warning is rate-limited. */
    int fallbackWarningsLogged() {
        return fallbackWarnings.get();
    }

    /** False for an internal IP: then it is the proxy's address, and the fallback applies. */
    private boolean ipIsUsable(String clientIp, Instant now) {
        if (!ClientIpPrivacy.isInternal(clientIp)) {
            return true;
        }
        Instant last = lastFallbackWarning.get();
        boolean due = last == null || !now.isBefore(last.plus(FALLBACK_WARNING_INTERVAL));
        if (due && lastFallbackWarning.compareAndSet(last, now)) {
            fallbackWarnings.incrementAndGet();
            log.warn("Login lockout: client IP is internal ({}), so the IP rules are skipped and the email alone "
                    + "locks after {} failures. Expected on localhost. In production, check "
                    + "server.forward-headers-strategy=native and X-Real-IP (ADR 0008). Logged at most once per {}.",
                    ClientIpPrivacy.truncate(clientIp), MAX_FAILURES_EMAIL_AND_IP, FALLBACK_WARNING_INTERVAL);
        }
        return false;
    }

    private void addFailure(String key, Instant now) {
        failures.compute(key, (k, old) -> {
            int count = old == null || old.forgotten(now) ? 1 : old.count() + 1;
            return new Failures(count, now.plus(LOCK_TIME));
        });
    }

    private boolean isLocked(String key, int maxFailures, Instant now) {
        Failures entry = failures.get(key);
        return entry != null && entry.count() >= maxFailures && !entry.forgotten(now);
    }

    /** Unknown emails are counted too, so the lockout does not reveal which emails exist. */
    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String emailKey(String email) {
        return "email:" + normalize(email);
    }

    private static String ipKey(String ipHash) {
        return "ip:" + ipHash;
    }

    private static String emailAndIpKey(String email, String ipHash) {
        return "email+ip:" + normalize(email) + "|" + ipHash;
    }
}
