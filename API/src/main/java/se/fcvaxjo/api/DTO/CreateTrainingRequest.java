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
    private String title;
}
