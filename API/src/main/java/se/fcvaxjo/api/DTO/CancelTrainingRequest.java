package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/** Optional reason when a training is called off. Blank means no reason. */
@Getter
@Setter
public class CancelTrainingRequest {
    private String reason;
}
