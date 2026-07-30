package se.fcvaxjo.api.dto;

/**
 * Simple error body for API clients.
 */
public record ErrorResponse(
        String message
) {
}
