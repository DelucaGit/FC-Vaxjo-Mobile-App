package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {
    private String name;
    private String email;
    private String roleName;
    private Integer playerNumber;
    private String mobilePhoneNumber;

    /** Existing PARENT id when creating a PLAYER. Do not send with newParent. */
    private Long parentId;

    /** New PARENT details when creating a PLAYER. Do not send with parentId. */
    private NewParentRequest newParent;
}
