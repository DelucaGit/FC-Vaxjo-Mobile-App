package se.fcvaxjo.api.dto;

/**
 * Returned after a successful login or register.
 * Put token in header: Authorization: Bearer &lt;token&gt;
 */
public record AuthResponse(
        String token,
        String tokenType,
        UserResponse user
) {
    public static AuthResponse bearer(String token, UserResponse user) {
        return new AuthResponse(token, "Bearer", user);
    }
}
