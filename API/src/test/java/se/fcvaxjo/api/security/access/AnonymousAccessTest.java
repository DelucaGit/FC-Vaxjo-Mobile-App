package se.fcvaxjo.api.security.access;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;

import se.fcvaxjo.api.service.AuthService;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.ContractOperations;
import se.fcvaxjo.api.support.ContractOperations.Operation;
import se.fcvaxjo.api.support.SampleRequests;
import org.springframework.test.web.servlet.ResultActions;

/**
 * No token means 401, except login.
 * The list is read from docs/api/openapi.yaml. Planned public URLs are included:
 * they are not built yet, so they must not answer 200 to a stranger.
 */
class AnonymousAccessTest extends ClubApiTest {

    @Test
    void login_staysOpenWithoutAToken() throws Exception {
        // The route is public. A bad password is 401 with the same text as
        // every other failed login (S1-9). That text is not "Login required",
        // so the login service answered. The filter did not lock the door.
        post(Actor.ANON, "/api/auth/login",
                SampleRequests.login("ingen@example.test", "not-the-shared-login"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(AuthService.INVALID_LOGIN_MESSAGE));
    }

    @ParameterizedTest(name = "{0} {1} utan token")
    @MethodSource("protectedOperations")
    void anonymous_isTurnedAway(String method, String pathTemplate) throws Exception {
        // SecurityConfig permits only POST /api/auth/login. Everything else needs a token.
        String path = fill(pathTemplate);

        ResultActions response = call(method, path);

        response.andExpect(status().isUnauthorized());
        assertNoLeak(response);
    }

    static Stream<Arguments> protectedOperations() throws Exception {
        return ContractOperations.read().stream()
                .filter(operation -> !ContractOperations.isLogin(operation))
                .map(operation -> Arguments.of(operation.method(), operation.path()));
    }

    @Test
    void contract_includesLoginAndTheStaffRoutes() throws Exception {
        // If the parser returns nothing, the parameterized test above would pass without checking a single door.
        var operations = ContractOperations.read();
        assertTrue(operations.stream().anyMatch(ContractOperations::isLogin));
        assertTrue(operations.stream().anyMatch(operation -> operation.path().equals("/api/users")));
        assertTrue(operations.stream().anyMatch(operation -> operation.path().equals("/api/trainings/{id}/attendance/{playerId}")));
        assertTrue(operations.size() >= 25);
    }

    private ResultActions call(String method, String path) throws Exception {
        return switch (method) {
            case "GET" -> get(Actor.ANON, path);
            case "POST" -> post(Actor.ANON, path, java.util.Map.of());
            case "PUT" -> put(Actor.ANON, path, java.util.Map.of());
            case "DELETE" -> delete(Actor.ANON, path);
            default -> throw new IllegalStateException(method);
        };
    }

    private String fill(String template) {
        String path = template;
        if (path.contains("/teams/")) {
            path = path.replace("{id}", String.valueOf(world.teamAlfaId()));
            path = path.replace("{userId}", String.valueOf(world.coachAlfaId()));
        } else if (path.contains("/users/")) {
            path = path.replace("{id}", String.valueOf(world.playerAlfaId()));
        } else if (path.contains("/trainings/")) {
            path = path.replace("{id}", String.valueOf(world.trainingAlfaId()));
            path = path.replace("{playerId}", String.valueOf(world.playerAlfaId()));
        }
        if ("/api/trainings".equals(template)) {
            path = path + "?teamId=" + world.teamAlfaId();
        }
        if ("/api/users/search".equals(template)) {
            path = path + "?name=Alfa";
        }
        if (path.contains("{")) {
            throw new IllegalStateException("Path still has a placeholder: " + path);
        }
        return path;
    }

    private void assertNoLeak(ResultActions response) throws Exception {
        // A locked door must not show a stack trace or someone else's phone.
        assertBodyHides(response,
                "Exception",
                ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.EMAIL_PLAYER_BETA);
    }
}
