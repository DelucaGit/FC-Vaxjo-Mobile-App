package se.fcvaxjo.api.dto;

import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.User;

/**
 * Safe user data returned by the API.
 * Password is never included.
 */
public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        Role role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole()
        );
    }
}
