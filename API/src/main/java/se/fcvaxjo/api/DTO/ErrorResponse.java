package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Short error body for Postman and the Expo app.
 * Example: { "message": "User not found" }
 */
@Getter
@AllArgsConstructor
public class ErrorResponse {
    private final String message;
}
