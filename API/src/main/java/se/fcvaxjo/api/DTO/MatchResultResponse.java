package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/** Score from the club team's point of view. Absent on the match until it is played. */
@Getter
@Setter
@AllArgsConstructor
public class MatchResultResponse {
    private Integer goalsFor;
    private Integer goalsAgainst;
}
