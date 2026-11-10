package se.fcvaxjo.api.security.access;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import se.fcvaxjo.api.service.LoginAttemptLimiter;

/**
 * Issue #64, ADR 0008: the prod settings for the client IP, tested on a real Tomcat.
 * MockMvc skips Tomcat's RemoteIpValve, so only a real server shows that X-Real-IP is used.
 *
 * The test client connects from 127.0.0.1, which is on Spring Boot's default internal-proxies list,
 * so here it plays the part of Railway's edge proxy.
 *
 * This test does not roll back like ClubApiTest. It only sends failed logins for an email that has
 * no account, so nothing is written to the database. The in-memory counters are cleared around each test.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.forward-headers-strategy=native",
        "server.tomcat.remoteip.remote-ip-header=X-Real-IP",
        "server.tomcat.remoteip.protocol-header=X-Forwarded-Proto" })
@ActiveProfiles("test")
class LoginClientIpServerTest {

    private static final String NO_ACCOUNT = "ip-test-no-account@example.test";

    @LocalServerPort
    private int port;

    @Autowired
    private LoginAttemptLimiter limiter;

    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    @AfterEach
    void clearCounters() {
        limiter.clear();
    }

    @Test
    void xRealIp_fromTrustedProxy_isTheClientIp() throws Exception {
        for (int i = 1; i <= 5; i++) {
            assertEquals(401, badLogin("203.0.113.5"));
        }

        assertEquals(429, badLogin("203.0.113.5"));
        // Same email from another phone: the email + IP rule does not apply, and 6 < 20.
        assertEquals(401, badLogin("198.51.100.7"));
    }

    private int badLogin(String realIp) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                .header("Content-Type", "application/json")
                .header("X-Real-IP", realIp)
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + NO_ACCOUNT + "\",\"password\":\"wrong-password\"}"))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
