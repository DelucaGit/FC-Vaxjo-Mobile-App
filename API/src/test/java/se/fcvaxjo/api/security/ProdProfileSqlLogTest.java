package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.junit.jupiter.api.Test;

/**
 * F9: production must not print SQL. The files are the source of truth,
 * so this test reads them instead of starting a second Spring profile.
 */
class ProdProfileSqlLogTest {

    @Test
    void prodProfileTurnsSqlLoggingOff() throws IOException {
        assertEquals("false", value("/application-prod.properties"));
    }

    @Test
    void defaultProfileTurnsSqlLoggingOff() throws IOException {
        // A forgotten SPRING_PROFILES_ACTIVE must not turn the log on.
        assertEquals("false", value("/application.properties"));
    }

    @Test
    void devProfileTurnsSqlLoggingOn() throws IOException {
        assertEquals("true", value("/application-dev.properties"));
    }

    private String value(String path) throws IOException {
        Properties properties = new Properties();
        try (InputStream in = ProdProfileSqlLogTest.class.getResourceAsStream(path)) {
            assertNotNull(in, path + " is missing");
            properties.load(in);
        }
        return properties.getProperty("spring.jpa.show-sql");
    }
}
