package se.fcvaxjo.api.exception;

/**
 * Client sent something we cannot accept (blank search, bad role name, duplicate email).
 * Mapped to HTTP 400 by {@link ApiExceptionHandler}.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
