package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Answer to a password reset. The plain temporary password is shown once. */
@Getter
@AllArgsConstructor
public class PasswordResetResponse {
    private Long id;
    private String temporaryPassword;
}
