package se.fcvaxjo.api.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.User;

/**
 * Creates and reads JWT tokens.
 *
 * A JWT is a signed string the app sends after login.
 * The API checks that signature on later requests.
 */
@Service
public class JwtService {

    private static final int MIN_SECRET_LENGTH = 32;

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(FcvaxjoProperties properties) {
        String secret = properties.jwt().secret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is missing. Set it in your environment (see .env.example)."
            );
        }
        if (secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least " + MIN_SECRET_LENGTH + " characters."
            );
        }

        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = properties.jwt().expirationMs();
    }

    public String createToken(User user) {
        Date now = new Date();
        Date expiresAt = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiresAt)
                .signWith(secretKey)
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public Long extractUserId(String token) {
        return parseClaims(token).get("userId", Long.class);
    }

    public Role extractRole(String token) {
        return Role.valueOf(parseClaims(token).get("role", String.class));
    }

    public boolean isValid(String token, String expectedEmail) {
        Claims claims = parseClaims(token);
        boolean emailMatches = expectedEmail.equals(claims.getSubject());
        boolean notExpired = claims.getExpiration().after(new Date());
        return emailMatches && notExpired;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
