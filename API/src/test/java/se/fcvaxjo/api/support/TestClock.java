package se.fcvaxjo.api.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

/**
 * A clock that tests can move forward by hand, so a 15-minute lockout
 * can be tested without waiting 15 minutes.
 * {@link ClubApiTest} resets it before each test, because Spring reuses
 * the same bean across test classes.
 */
public class TestClock extends Clock {

    public static final Instant START = Instant.parse("2026-01-01T12:00:00Z");

    private final AtomicReference<Instant> now = new AtomicReference<>(START);

    public void advance(Duration duration) {
        now.updateAndGet(current -> current.plus(duration));
    }

    /** Jumps straight to a point in time, for example the start of a training. */
    public void set(Instant instant) {
        now.set(instant);
    }

    public void reset() {
        now.set(START);
    }

    @Override
    public Instant instant() {
        return now.get();
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        throw new UnsupportedOperationException("TestClock is always UTC");
    }
}
