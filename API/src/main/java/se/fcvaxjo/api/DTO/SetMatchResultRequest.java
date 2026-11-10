package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/** Body for recording the score after the match. Both numbers are required. */
@Getter
@Setter
public class SetMatchResultRequest {
    private Integer goalsFor;
    private Integer goalsAgainst;
}
