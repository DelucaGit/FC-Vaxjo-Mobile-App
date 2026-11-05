package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Staff view of one match. No player contact details.
 * result is null until the score is recorded.
 */
@Getter
@Setter
@AllArgsConstructor
public class MatchResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    private String homeAway;
    private MatchResultResponse result;
    private Long createdByUserId;
}
