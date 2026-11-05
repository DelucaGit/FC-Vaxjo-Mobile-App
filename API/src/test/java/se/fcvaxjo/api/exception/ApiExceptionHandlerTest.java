package se.fcvaxjo.api.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * A database constraint must not send SQL or a stack trace to the caller.
 */
class ApiExceptionHandlerTest {

    @Test
    void dataIntegrityViolation_hidesSqlAndTheStack() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        DataIntegrityViolationException failure = new DataIntegrityViolationException(
                "could not execute statement; SQL [insert into app_user]; constraint [player_number_key]");

        String message = handler.handleDataIntegrity(failure).getBody().getMessage();

        assertEquals("Could not save the user", message);
        assertFalse(message.contains("SQL"));
        assertFalse(message.contains("player_number"));
        assertFalse(message.contains("Exception"));
    }
}
