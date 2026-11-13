package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Staff view of one match. No player contact details.
 * result is null until the score is recorded.
 */
@Getter
@Setter
@AllArgsConstructor
public class MatchResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private String opponent;
    private LocalDateTime kickoffAt;
    private String venue;
    private String homeAway;
    private MatchResultResponse result;
    /** SCHEDULED or CANCELLED. A missing value in the database is shown as SCHEDULED. */
    private String status;
    private String cancelReason;
    private Long createdByUserId;
    /** Null while the attendance list is open. Set when it is frozen. */
    private LocalDateTime attendanceLockedAt;
}
