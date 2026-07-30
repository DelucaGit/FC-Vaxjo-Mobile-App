package se.fcvaxjo.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * App settings loaded from environment / application.properties.
 * Secrets must never be hard-coded — only referenced as ${ENV_VAR}.
 */
@ConfigurationProperties(prefix = "fcvaxjo")
public record FcvaxjoProperties(
        Jwt jwt,
        Admin admin,
        Cors cors
) {
    public record Jwt(
            String secret,
            long expirationMs
    ) {
    }

    public record Admin(
            boolean seed,
            String email,
            String password,
            String firstName,
            String lastName
    ) {
    }

    public record Cors(
            String allowedOrigins
    ) {
    }
}
