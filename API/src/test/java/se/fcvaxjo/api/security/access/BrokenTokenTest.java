package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.web.servlet.ResultActions;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;

/**
 * A token that is not exactly the one we signed, for a user who is still active,
 * must be treated as "not logged in". The body stays the short 401 text.
 */
class BrokenTokenTest extends ClubApiTest {

    private static final String OTHER_SIGNING_KEY = "test-only-other-signing-key-000000";

    @Value("${app.jwt.secret}")
    private String signingKey;

    @Test
    void expiredToken_isRejected() throws Exception {
        // The signature is valid, but the time in the token is already past. That must not log anyone in.
        String token = signed(world.playerAlfaId(), "PLAYER", signingKey, new Date(System.currentTimeMillis() - 60_000));

        ResultActions response = getWithAuthorization("Bearer " + token, "/api/teams");

        assertLoginRequired(response);
    }

    @Test
    void changedPayload_withTheOldSignature_isRejected() throws Exception {
        // Keeping the signature and rewriting the role would turn a player into an admin if we did not check the signature.
        String token = token(world.playerAlfaId(), "PLAYER");
        String forged = rewritePayload(token, "\"role\":\"PLAYER\"", "\"role\":\"ADMIN\"");

        ResultActions response = getWithAuthorization("Bearer " + forged, "/api/users");

        assertLoginRequired(response);
    }

    @Test
    void changedUserId_withTheOldSignature_isRejected() throws Exception {
        String token = token(world.playerAlfaId(), "PLAYER");
        String forged = rewritePayload(
                token,
                "\"sub\":\"" + world.playerAlfaId() + "\"",
                "\"sub\":\"" + world.adminId() + "\"");

        ResultActions response = getWithAuthorization("Bearer " + forged, "/api/users/" + world.adminId());

        assertLoginRequired(response);
    }

    @Test
    void tokenSignedWithAnotherKey_isRejected() throws Exception {
        // A key that is not the test profile key must not be accepted, even if the shape looks right.
        String token = signed(world.adminId(), "ADMIN", OTHER_SIGNING_KEY, new Date(System.currentTimeMillis() + 60_000));

        ResultActions response = getWithAuthorization("Bearer " + token, "/api/teams");

        assertLoginRequired(response);
    }

    @Test
    void unsignedAlgNoneToken_isRejected() throws Exception {
        // "alg": "none" is a token with no signature. Accepting it would let anyone pick a role.
        String token = unsignedToken(world.adminId(), "ADMIN");

        ResultActions response = getWithAuthorization("Bearer " + token, "/api/users");

        assertLoginRequired(response);
    }

    @Test
    void tokenForAMissingUser_isRejected() throws Exception {
        // The signature can be real and the user id still missing. The filter checks the database.
        String token = token(9_000_000L, "ADMIN");

        ResultActions response = getWithAuthorization("Bearer " + token, "/api/teams");

        assertLoginRequired(response);
        assertBodyHides(response, "saknas@example.test");
    }

    @Test
    void garbageToken_isRejected() throws Exception {
        ResultActions response = getWithAuthorization("Bearer aaa.bbb.ccc", "/api/teams");

        assertLoginRequired(response);
    }

    @Test
    void wrongPrefix_isRejected() throws Exception {
        // Only "Bearer " counts. Another prefix is the same as sending no token.
        String token = token(world.adminId(), "ADMIN");

        ResultActions response = getWithAuthorization("Token " + token, "/api/teams");

        assertLoginRequired(response);
    }

    private void assertLoginRequired(ResultActions response) throws Exception {
        response.andExpect(status().isUnauthorized());
        response.andExpect(jsonPath("$.message").value("Login required"));
        assertBodyHides(response,
                "Exception",
                ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.EMAIL_PLAYER_BETA);
    }

    private String token(long userId, String roleName) {
        return signed(userId, roleName, signingKey, new Date(System.currentTimeMillis() + 60_000));
    }

    private String signed(long userId, String roleName, String keyText, Date expiry) {
        SecretKey key = Keys.hmacShaKeyFor(keyText.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", "test-only@example.test")
                .claim("role", roleName)
                .issuedAt(new Date(expiry.getTime() - 60_000))
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    private String rewritePayload(String token, String from, String to) {
        String[] parts = token.split("\\.");
        String json = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String changed = json.replace(from, to);
        parts[1] = base64Url(changed.getBytes(StandardCharsets.UTF_8));
        return parts[0] + "." + parts[1] + "." + parts[2];
    }

    private String unsignedToken(long userId, String roleName) {
        String header = base64Url("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = base64Url(("{\"sub\":\"" + userId + "\",\"role\":\"" + roleName + "\"}")
                .getBytes(StandardCharsets.UTF_8));
        return header + "." + payload + ".";
    }

    private String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
