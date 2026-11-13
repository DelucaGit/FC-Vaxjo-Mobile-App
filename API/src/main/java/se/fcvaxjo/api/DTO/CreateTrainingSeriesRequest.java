package se.fcvaxjo.api.DTO;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * Many trainings in one call (issue #129). Each date from fromDate to toDate
 * whose weekday is in weekdays becomes one ordinary training. No series is stored.
 */
@Getter
@Setter
public class CreateTrainingSeriesRequest {
    private Long teamId;
    /** FOOTBALL or FITNESS, same as CreateTrainingRequest. */
    private String type;
    /** MONDAY ... SUNDAY. Strings so an unknown value gets our own 400 message. */
    private List<String> weekdays;
    private LocalTime startTime;
    private LocalTime endTime;
    /** Optional place, same as CreateTrainingRequest.venue. */
    private String venue;
    private LocalDate fromDate;
    /** Inclusive. */
    private LocalDate toDate;
}
