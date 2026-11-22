package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Optional body for POST /api/leave-requests/{id}/deny (issue #213).
 * note is the coach's comment to the player or parent. Blank is stored as null.
 */
@Getter
@Setter
public class DenyLeaveRequestRequest {
    private String note;
}
