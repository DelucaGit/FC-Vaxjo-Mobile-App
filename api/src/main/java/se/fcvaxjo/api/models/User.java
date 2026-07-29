package se.fcvaxjo.api.models;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class User {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private Role role;
    private String phone;

}