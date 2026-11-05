package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class AttendanceResponse {
    private Long playerUserId;
    private String playerName;
    private Integer playerNumber;
    /** PRESENT, ABSENT, EXCUSED, or null if not marked yet. */
    private String status;
}
