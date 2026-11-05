package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

/**
 * Replace the time, the place, and the title.
 * The team does not change. Attendance rows stay on this training.
 */
@Getter
@Setter
public class UpdateTrainingRequest {
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private String title;
    private String venue;
}
