package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for PUT /api/trainings/{id}/cancellation.
 * cancelled true or missing calls the training off; false reactivates it.
 * reason is optional and only used when cancelling. Blank means no reason.
 */
@Getter
@Setter
public class CancelTrainingRequest {
    private Boolean cancelled;
    private String reason;
}
