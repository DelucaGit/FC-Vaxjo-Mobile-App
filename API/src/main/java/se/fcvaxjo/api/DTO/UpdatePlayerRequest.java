package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Edit a PLAYER: name, email, phone, shirt, team, and linked parent details.
 * teamId is required (change team, never clear it).
 * parentId optional — switch to another PARENT.
 * parentName / parentEmail / parentMobilePhoneNumber edit the linked parent's info.
 */
@Getter
@Setter
public class UpdatePlayerRequest {
    private String name;
    private String email;
    private String mobilePhoneNumber;
    private Integer playerNumber;
    private Long teamId;
    private Long parentId;
    private String parentName;
    private String parentEmail;
    private String parentMobilePhoneNumber;
}