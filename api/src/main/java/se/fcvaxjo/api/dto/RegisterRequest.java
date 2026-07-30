package se.fcvaxjo.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Body for POST /api/auth/register.
 * Public self-signup is only for parents (safe default for a club app).
 */
public record RegisterRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Email String email,
        @NotBlank String password,
        String phone
) {
}
