package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class TrainingResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private String title;
    private Long createdByUserId;
}
