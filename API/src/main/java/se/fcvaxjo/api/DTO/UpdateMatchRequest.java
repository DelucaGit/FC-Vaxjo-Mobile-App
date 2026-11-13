package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

/**
 * Replace opponent, kickoff time, place, and home/away (issue #127).
 * The team does not change. The score is set with PUT /api/matches/{id}/result.
 */
@Getter
@Setter
public class UpdateMatchRequest {
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    /** HOME or AWAY. */
    private String homeAway;
}
