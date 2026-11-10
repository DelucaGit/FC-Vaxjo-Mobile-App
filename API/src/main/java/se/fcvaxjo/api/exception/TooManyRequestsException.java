package se.fcvaxjo.api.exception;

/**
 * The caller has tried too many times and must wait.
 * Mapped to HTTP 429 by {@link ApiExceptionHandler}.
 */
public class TooManyRequestsException extends RuntimeException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
