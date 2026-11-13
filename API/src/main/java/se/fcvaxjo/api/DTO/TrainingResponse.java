package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class TrainingResponse {
    private Long id;
    private Long teamId;
    private String teamName;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    /** FOOTBALL or FITNESS. A missing value in the database is shown as FOOTBALL. */
    private String type;
    private String venue;
    /** SCHEDULED or CANCELLED. A missing value in the database is shown as SCHEDULED. */
    private String status;
    private String cancelReason;
    private Long createdByUserId;
    /** When the attendance list was frozen. Null while it is still open (issue #86). */
    private LocalDateTime attendanceLockedAt;
}
