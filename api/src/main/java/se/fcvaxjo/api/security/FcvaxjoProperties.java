package se.fcvaxjo.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings for JWT tokens and the first admin account.
 * Values come from application.properties (fcvaxjo.*).
 */
@ConfigurationProperties(prefix = "fcvaxjo")
public record FcvaxjoProperties(
        Jwt jwt,
        Admin admin
) {
    public record Jwt(
            String secret,
            long expirationMs
    ) {
    }

    public record Admin(
            String email,
            String password,
            String firstName,
            String lastName
    ) {
    }
}
