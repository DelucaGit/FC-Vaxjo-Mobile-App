package se.fcvaxjo.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Body for POST /api/auth/login.
 */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
