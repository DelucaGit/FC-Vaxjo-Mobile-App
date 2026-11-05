package se.fcvaxjo.api.exception;

/**
 * The caller is not logged in, or the login itself failed.
 * Mapped to HTTP 401 by {@link ApiExceptionHandler}.
 *
 * A failed login uses one shared message. A different message for
 * "inactive" or "unknown email" would tell the caller that the account exists.
 * A missing token on a protected URL is a different path ({@code SecurityConfig})
 * and says "Login required".
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
