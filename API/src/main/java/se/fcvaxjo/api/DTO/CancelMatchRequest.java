package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for PUT /api/matches/{id}/cancellation (issue #133). Same shape as CancelTrainingRequest.
 * cancelled true or missing calls the match off; false reactivates it.
 * reason is optional and only used when cancelling. Blank means no reason.
 */
@Getter
@Setter
public class CancelMatchRequest {
    private Boolean cancelled;
    private String reason;
}
