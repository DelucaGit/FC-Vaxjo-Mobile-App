package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for creating a match. The score is optional and is usually left empty.
 */
@Getter
@Setter
public class CreateMatchRequest {
    private Long teamId;
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    /** HOME or AWAY. */
    private String homeAway;
    private Integer goalsFor;
    private Integer goalsAgainst;
}
