package se.fcvaxjo.api.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * One leave request as the player or parent sees it.
 * activityKind is TRAINING or MATCH. reasonType and reasonText are x-pii.
 */
@Getter
@Setter
@AllArgsConstructor
public class LeaveRequestResponse {
    private Long id;
    private Long playerUserId;
    private String playerName;
    private String activityKind;
    private Long activityId;
    private LocalDateTime activityStart;
    private Long teamId;
    private String teamName;
    private String reasonType;
    private String reasonText;
    private String status;
    private String coachNote;
    private LocalDateTime createdAt;
}
