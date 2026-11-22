package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for POST /api/my/leave-requests.
 * Exactly one of trainingId and matchId. playerUserId is required for PARENT;
 * a PLAYER may leave it out or give their own id.
 * reasonType is a string so an unknown value gets a plain Swedish 400.
 */
@Getter
@Setter
public class CreateLeaveRequestRequest {
    private Long trainingId;
    private Long matchId;
    private Long playerUserId;
    private String reasonType;
    private String reasonText;
}
