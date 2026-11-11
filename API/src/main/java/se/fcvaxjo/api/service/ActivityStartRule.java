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
 */
@Component
public class ActivityStartRule {

    /** Activity times are club wall-clock times in Sweden, stored without a zone. */
    static final ZoneId CLUB_ZONE = ZoneId.of("Europe/Stockholm");

    static final String START_IN_PAST =
            "Starttiden har redan passerat. Välj en tid som inte har varit.";

    private final Clock clock;

    public ActivityStartRule(Clock clock) {
        this.clock = clock;
    }

    public void assertNotInPast(ClubRole callerRole, LocalDateTime startsAt) {
        if (callerRole != null && callerRole.canSetPastActivityTime()) {
            return;
        }
        LocalDateTime now = LocalDateTime.ofInstant(clock.instant(), CLUB_ZONE);
        if (startsAt.isBefore(now)) {
            throw new BadRequestException(START_IN_PAST);
        }
    }
}
