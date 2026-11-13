package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import se.fcvaxjo.api.exception.BadRequestException;

/**
 * The ?when= filter on the activity lists (issue #116).
 * UPCOMING: from the start of today in Sweden, soonest first. Today's activities stay
 * in the list all day, even after they have started.
 * PAST: before the start of today, newest first.
 * No value (null) means "everything", which is how the lists worked before.
 */
public enum ActivityWhen {
    UPCOMING,
    PAST;

    /** Activity times are club wall-clock times in Sweden, stored without a zone. */
    private static final ZoneId CLUB_ZONE = ZoneId.of("Europe/Stockholm");

    /**
     * @return null when the client sent nothing, so the caller lists everything
     */
    public static ActivityWhen parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return switch (value.trim().toLowerCase()) {
            case "upcoming" -> UPCOMING;
            case "past" -> PAST;
            default -> throw new BadRequestException(
                    "Ogiltigt värde för when. Använd upcoming eller past.");
        };
    }

    /** Midnight at the start of today in Sweden, as a club wall-clock time. */
    public static LocalDateTime startOfToday(Clock clock) {
        return LocalDate.ofInstant(clock.instant(), CLUB_ZONE).atStartOfDay();
    }
}
