package se.fcvaxjo.api.models;

import lombok.Getter;
import lombok.Setter;

/**
 * Anyone who can log in to the app.
 * The Role field says if they are admin, coach, parent, or player.
 */
@Getter
@Setter
public class User {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String phone;
    private Role role;
}
