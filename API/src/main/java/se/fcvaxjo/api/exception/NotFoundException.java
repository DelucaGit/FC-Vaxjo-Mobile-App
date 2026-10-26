package se.fcvaxjo.api.exception;

/**
 * The thing we looked for is not in the database.
 * Mapped to HTTP 404 by {@link ApiExceptionHandler}.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
