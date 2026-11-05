package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.ObjectMapper;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * The filter reads the user in its own database call, so these tests save
 * rows for real and delete them afterwards. A rolled-back test transaction
 * would hide the user from that call.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtAuthFilterIntegrationTest {

    private static final String LOGIN_REQUIRED = "{\"message\":\"Login required\"}";

    /** Not a real password. The pre-commit check ignores the test-only marker. */
    private static final String CURRENT_LOGIN = "test-only-current-login";
    private static final String NEXT_LOGIN = "test-only-next-login-99";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper json;

    private final List<AppUser> createdUsers = new ArrayList<>();

    @AfterEach
    void deleteCreatedUsers() {
        userRepository.deleteAll(createdUsers);
        createdUsers.clear();
    }

    @Test
    void activeAccount_canCallAProtectedEndpointAndRefresh() throws Exception {
        AppUser coach = saveUser("COACH");
        String token = tokenFor(coach, "COACH");

        expectOk(token);
        mockMvc.perform(post("/api/auth/refresh").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void deactivatedAccount_returns401UntilTheAccountIsActiveAgain() throws Exception {
        AppUser coach = saveUser("COACH");
        String token = tokenFor(coach, "COACH");
        expectOk(token);

        coach.setActive(false);
        userRepository.saveAndFlush(coach);

        expectLoginRequired(token);
        mockMvc.perform(post("/api/auth/refresh").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json(LOGIN_REQUIRED));

        // Same token works again once the account is active, because we read
        // the database on each request instead of storing a version in the token.
        coach.setActive(true);
        userRepository.saveAndFlush(coach);
        expectOk(token);
    }

    @Test
    void chairmanToken_isRejectedWhenTheRoleIsNoLongerChairman() throws Exception {
        AppUser chairman = saveUser("CHAIRMAN");
        String oldToken = tokenFor(chairman, "CHAIRMAN");
        expectOk(oldToken);

        Role coachRole = roleRepository.findByName("COACH").orElseThrow();
        chairman.setRoleId(coachRole.getId());
        userRepository.saveAndFlush(chairman);

        expectLoginRequired(oldToken);

        expectOk(tokenFor(chairman, "COACH"));
    }

    @Test
    void changedRole_rejectsTheOldTokenUntilAMatchingTokenIsUsed() throws Exception {
        AppUser coach = saveUser("COACH");
        String oldToken = tokenFor(coach, "COACH");
        expectOk(oldToken);

        Role playerRole = roleRepository.findByName("PLAYER").orElseThrow();
        coach.setRoleId(playerRole.getId());
        userRepository.saveAndFlush(coach);

        expectLoginRequired(oldToken);

        // GET /api/users is the staff list. Other stories limit that list to staff.
        // A player may open their own row, so the new token is checked there.
        String newToken = tokenFor(coach, "PLAYER");
        mockMvc.perform(get("/api/users/" + coach.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + newToken))
                .andExpect(status().isOk());
    }

    @Test
    void tokenFromBeforePasswordChange_returns401AndTheNewTokenWorks() throws Exception {
        AppUser coach = saveUser("COACH");
        coach.setPasswordHash(passwordEncoder.encode(CURRENT_LOGIN));
        coach.setMustChangePassword(false);
        userRepository.saveAndFlush(coach);

        String oldToken = loginAndReadToken(coach.getEmail(), CURRENT_LOGIN);
        // iat is whole seconds. The change has to land in a later second,
        // or the old token is still inside the window we deliberately allow.
        waitUntilALaterSecondThan(jwtService.getIssuedAt(oldToken));

        MvcResult changed = mockMvc.perform(post("/api/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + oldToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(SampleRequests.changeLogin(CURRENT_LOGIN, NEXT_LOGIN))))
                .andExpect(status().isOk())
                .andReturn();
        String newToken = tokenFrom(changed);

        AppUser after = userRepository.findById(coach.getId()).orElseThrow();
        assertTrue(after.isActive());
        assertTrue(after.getPasswordChangedAt().getEpochSecond()
                > jwtService.getIssuedAt(oldToken).getEpochSecond());

        expectLoginRequired(oldToken);
        expectOk(newToken);
    }

    @Test
    void unreadableToken_returns401() throws Exception {
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json(LOGIN_REQUIRED));
    }

    @Test
    void login_staysOpenWithoutAToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    private AppUser saveUser(String roleName) {
        Role role = roleRepository.findByName(roleName).orElseThrow();
        AppUser user = new AppUser();
        user.setName("S1-4 " + roleName);
        user.setEmail("s14-" + UUID.randomUUID() + "@example.com");
        user.setRoleId(role.getId());
        user.setActive(true);
        user.setMustChangePassword(false);
        AppUser saved = userRepository.saveAndFlush(user);
        createdUsers.add(saved);
        return saved;
    }

    private String tokenFor(AppUser user, String roleName) {
        return jwtService.createToken(user.getId(), user.getEmail(), roleName);
    }

    private String loginAndReadToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(SampleRequests.login(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        return tokenFrom(result);
    }

    private String tokenFrom(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString()).get("token").asString();
    }

    /**
     * Sleeps until the clock is in the second after {@code issuedAt}.
     * At most a little over one second. A negative wait means we are already there.
     */
    private void waitUntilALaterSecondThan(Instant issuedAt) throws InterruptedException {
        long nextSecondStart = (issuedAt.getEpochSecond() + 1) * 1000L;
        long pauseMs = nextSecondStart - System.currentTimeMillis() + 50;
        if (pauseMs > 0) {
            Thread.sleep(pauseMs);
        }
    }

    private void expectOk(String token) throws Exception {
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    private void expectLoginRequired(String token) throws Exception {
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json(LOGIN_REQUIRED));
    }
}
