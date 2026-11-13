package se.fcvaxjo.api.support;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;
import se.fcvaxjo.api.service.LoginAttemptLimiter;

/**
 * Shared setup for the role tests.
 * Before each test, {@link ClubFixture} loads two fake teams (Alfa and Beta) and rolls the database back afterwards.
 * {@code get}/{@code post}/{@code put}/{@code delete} send that person's token.
 * {@link Actor#ANON} sends no token.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestClockConfig.class)
public abstract class ClubApiTest {

    /** The fixture training on team Alfa starts 2026-11-06 18:00 Swedish time. */
    protected static final Instant FIXTURE_TRAINING_START = Instant.parse("2026-11-06T17:00:00Z");

    /** The fixture match on team Alfa kicks off 2026-12-12 14:00 Swedish time. */
    protected static final Instant FIXTURE_MATCH_KICKOFF = Instant.parse("2026-12-12T13:00:00Z");

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper json;

    @Autowired
    private RoleRepository roles;

    @Autowired
    private UserRepository users;

    @Autowired
    private TeamRepository teams;

    @Autowired
    private TeamCoachRepository links;

    @Autowired
    private TrainingRepository trainings;

    @Autowired
    private TrainingAttendanceRepository attendance;

    @Autowired
    private MatchRepository matches;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtService jwt;

    @Value("${app.test.shared-login}")
    protected String sharedLogin;

    @Value("${app.test.rotated-login}")
    protected String rotatedLogin;

    protected ClubWorld world;

    @Autowired
    private TestClock testClock;

    @Autowired
    private LoginAttemptLimiter loginLimiter;

    @BeforeEach
    void loadClub() {
        // The database rolls back after each test, but memory does not.
        // Without this, failed logins from one test could lock out the next.
        testClock.reset();
        loginLimiter.clear();
        world = ClubFixture.load(
                roles, users, teams, links, trainings, attendance, matches, encoder, jwt, sharedLogin);
    }

    /** Moves the shared test clock to a fixed point in time. */
    protected void moveClockTo(Instant target) {
        testClock.set(target);
    }

    protected String token(Actor actor) {
        return switch (actor) {
            case ANON -> null;
            case ADMIN -> world.adminToken();
            case CHAIRMAN -> world.chairmanToken();
            case COACH_ALFA -> world.coachAlfaToken();
            case COACH_BETA -> world.coachBetaToken();
            case PLAYER_ALFA -> world.playerAlfaToken();
            case PARENT_ALFA -> world.parentAlfaToken();
            case PARENT_BETA -> world.parentBetaToken();
            case INACTIVE_PLAYER -> world.inactivePlayerToken();
        };
    }

    protected ResultActions get(Actor actor, String path) throws Exception {
        return perform(MockMvcRequestBuilders.get(path), actor);
    }

    protected ResultActions get(Actor actor, String path, String param, String value) throws Exception {
        return perform(MockMvcRequestBuilders.get(path).param(param, value), actor);
    }

    protected ResultActions post(Actor actor, String path, Object body) throws Exception {
        return send(MockMvcRequestBuilders.post(path), actor, body);
    }

    protected ResultActions put(Actor actor, String path, Object body) throws Exception {
        return send(MockMvcRequestBuilders.put(path), actor, body);
    }

    protected ResultActions delete(Actor actor, String path) throws Exception {
        return perform(MockMvcRequestBuilders.delete(path), actor);
    }

    /** Sends the header exactly as given, so a test can try a broken token or a wrong prefix. */
    protected ResultActions getWithAuthorization(String authorizationHeader, String path) throws Exception {
        return mockMvc.perform(MockMvcRequestBuilders.get(path)
                .header("Authorization", authorizationHeader));
    }

    protected void assertBodyHides(ResultActions actions, String... hidden) throws Exception {
        String body = actions.andReturn().getResponse().getContentAsString();
        for (String value : hidden) {
            assertFalse(body.contains(value), "Response leaked '" + value + "'");
        }
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Actor actor, Object body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return perform(request, actor);
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, Actor actor) throws Exception {
        String bearer = token(actor);
        if (bearer != null) {
            request.header("Authorization", "Bearer " + bearer);
        }
        return mockMvc.perform(request);
    }
}
