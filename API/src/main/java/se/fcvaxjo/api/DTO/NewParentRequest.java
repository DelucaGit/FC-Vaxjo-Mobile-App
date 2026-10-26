package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Create a new PARENT in the same request as a new PLAYER.
 * Name, email, and phone are all required.
 */
@Getter
@Setter
public class NewParentRequest {
    private String name;
    private String email;
    private String mobilePhoneNumber;
}
