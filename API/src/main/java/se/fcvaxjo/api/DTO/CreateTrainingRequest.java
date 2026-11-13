package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateTrainingRequest {
    private Long teamId;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    /** FOOTBALL or FITNESS. A String so an unknown value gets our own 400 message. */
    private String type;
    /** Optional place. Null or blank stores null. */
    private String venue;
}
