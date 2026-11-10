package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * A player or parent's view of one match.
 * Same facts as the staff view, without createdByUserId.
 * No email and no phone.
 */
@Getter
@Setter
@AllArgsConstructor
public class MyMatchResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    private String homeAway;
    private MatchResultResponse result;
    /** Null while the attendance list is open. Set when it is frozen. */
    private LocalDateTime attendanceLockedAt;
}
