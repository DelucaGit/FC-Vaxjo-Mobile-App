package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class CreateUserResponse {
    private Long id;
    private String name;
    private String email;
    private String roleName;
    private Integer playerNumber;
    private String mobilePhoneNumber;
    private Long parentId;
    private String parentName;
    private String parentEmail;
    private String parentMobilePhoneNumber;
    private Long teamId;
    private String teamName;
    private boolean active;
    /** Plain temporary password shown once. Null on later fetches. */
    private String temporaryPassword;
    /** Set when a new parent was created with the player. */
    private String parentTemporaryPassword;
}
