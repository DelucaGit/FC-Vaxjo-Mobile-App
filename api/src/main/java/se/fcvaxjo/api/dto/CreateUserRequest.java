package se.fcvaxjo.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import se.fcvaxjo.api.models.Role;

/**
 * Body for POST /api/users.
 * We use a DTO so the API shape is clear and separate from the database entity.
 */
public record CreateUserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        String phone,
        @NotNull Role role
) {
}
