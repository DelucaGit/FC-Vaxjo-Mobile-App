package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

/**
 * Replace the time, the place, and the training type.
 * The team does not change. Attendance rows stay on this training.
 */
@Getter
@Setter
public class UpdateTrainingRequest {
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    /** FOOTBALL or FITNESS. A String so an unknown value gets our own 400 message. */
    private String type;
    private String venue;
}
