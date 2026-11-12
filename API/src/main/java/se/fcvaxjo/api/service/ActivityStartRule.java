package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.stereotype.Component;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.model.ClubRole;

/**
 * A training or match may not be given a start time that has already passed
 * (issue #115). Both date and clock time count, in Swedish time.
 * ADMIN is exempt and may set any time, for example to fix old history.
 *
 * The caller decides when to ask: on create, and on update only when the
 * start time really changes, so fixing the place on an old training still works.
 *
 * It also holds the opening of the attendance window (issue #124): attendance
 * may be marked or frozen ("Klar") only from 30 minutes before start. The window
 * closes by the auto-freeze in TrainingAttendanceRoster / MatchAttendanceRoster.
 */
@Component
public class ActivityStartRule {

    /** Activity times are club wall-clock times in Sweden, stored without a zone. */
    static final ZoneId CLUB_ZONE = ZoneId.of("Europe/Stockholm");

    static final String START_IN_PAST =
            "Starttiden har redan passerat. Välj en tid som inte har varit.";

    /** Attendance opens this long before a training or match starts. */
    public static final long ATTENDANCE_OPENS_MINUTES_BEFORE_START = 30;

    static final String ATTENDANCE_NOT_OPEN =
            "Närvaron öppnar 30 minuter före start.";

    private final Clock clock;

    public ActivityStartRule(Clock clock) {
        this.clock = clock;
    }

    public void assertNotInPast(ClubRole callerRole, LocalDateTime startsAt) {
        if (callerRole != null && callerRole.canSetPastActivityTime()) {
            return;
        }
        if (isInPast(startsAt)) {
            throw new BadRequestException(START_IN_PAST);
        }
    }

    /** True when startsAt is before now in Swedish time. The training series uses it to skip old dates. */
    public boolean isInPast(LocalDateTime startsAt) {
        return startsAt.isBefore(now());
    }

    /**
     * Throws 400 when it is earlier than 30 minutes before startsAt (Swedish time).
     * Applies to every role: attendance for something that has not happened is wrong.
     */
    public void assertAttendanceOpen(LocalDateTime startsAt) {
        LocalDateTime opensAt = startsAt.minusMinutes(ATTENDANCE_OPENS_MINUTES_BEFORE_START);
        if (now().isBefore(opensAt)) {
            throw new BadRequestException(ATTENDANCE_NOT_OPEN);
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), CLUB_ZONE);
    }
}
