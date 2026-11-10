package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class MyTrainingResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private String title;
    private String venue;
    private Long playerUserId;
    private String playerName;
    /** PRESENT, ABSENT, EXCUSED, or null if not marked / not on snapshot. */
    private String status;
    /** SCHEDULED or CANCELLED. Separate from the attendance status above. */
    private String trainingStatus;
    private String cancelReason;
    /** When the attendance list was frozen. Null while it is still open (issue #86). */
    private LocalDateTime attendanceLockedAt;
}
