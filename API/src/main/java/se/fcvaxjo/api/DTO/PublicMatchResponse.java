package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Public match. Opponent, time, place, home or away, and an optional score.
 * No createdByUserId and no player list.
 */
@Getter
@Setter
@AllArgsConstructor
public class PublicMatchResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    private String homeAway;
    private MatchResultResponse result;
}
