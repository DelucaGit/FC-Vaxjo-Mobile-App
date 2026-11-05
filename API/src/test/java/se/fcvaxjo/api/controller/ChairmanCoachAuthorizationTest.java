package se.fcvaxjo.api.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Chairman may create a player, a parent, or a coach, and turn a player into a coach.
 * The token points at a real active user with that role. A made-up id is rejected
 * once the JWT filter looks the account up (PR #29).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChairmanCoachAuthorizationTest {

    private static final String CANNOT_ASSIGN_CLUB_LEAD =
            "CHAIRMAN cannot assign the role ADMIN or CHAIRMAN";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void chairmanAndAdminCanCreateACoachWithoutAShirtNumber() throws Exception {
        long chairmanCoachId = createUser("CHAIRMAN", coachJson("Chair Coach", email("chair-coach"), 9));
        expectCoachWithoutRoster(chairmanCoachId);

        long adminCoachId = createUser("ADMIN", coachJson("Admin Coach", email("admin-coach"), 8));
        expectCoachWithoutRoster(adminCoachId);
    }

    @Test
    void chairmanCanCreateParentAndPlayer() throws Exception {
        long teamId = createTeam("S1-8 Staff " + UUID.randomUUID());
        long parentId = createUser("CHAIRMAN", userJson("Parent", email("parent"), "PARENT"));
        long playerId = createUser("CHAIRMAN", playerJson(email("player"), parentId, teamId, 12));
        expectUser(parentId, "PARENT");
        expectUser(playerId, "PLAYER");
    }

    @Test
    void chairmanCannotCreateAdminOrChairman() throws Exception {
        expectCreateForbidden("ADMIN", CANNOT_ASSIGN_CLUB_LEAD);
        expectCreateForbidden("CHAIRMAN", CANNOT_ASSIGN_CLUB_LEAD);
    }

    @Test
    void adminCanStillCreateAnAdmin() throws Exception {
        long id = createUser("ADMIN", userJson("Still Admin", email("new-admin"), "ADMIN"));
        expectUser(id, "ADMIN");
    }

    @Test
    void chairmanPromotesPlayerAndClearsRosterFields() throws Exception {
        long teamId = createTeam("S1-8 Promote " + UUID.randomUUID());
        long parentId = createUser("ADMIN", userJson("Parent", email("parent"), "PARENT"));
        long playerId = createUser("ADMIN", playerJson(email("player"), parentId, teamId, 17));

        mockMvc.perform(put("/api/users/" + playerId + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer("CHAIRMAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"COACH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(playerId))
                .andExpect(jsonPath("$.roleName").value("COACH"));

        mockMvc.perform(get("/api/users/" + playerId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("COACH"))
                .andExpect(jsonPath("$.parentId").value(nullValue()))
                .andExpect(jsonPath("$.playerNumber").value(nullValue()))
                .andExpect(jsonPath("$.teamId").value(nullValue()));

        // The parent account stays. Only the link on the player is removed.
        mockMvc.perform(get("/api/users/" + parentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("PARENT"));

        // Gone from the player list, and not auto-linked as a coach of the team.
        mockMvc.perform(get("/api/teams/" + teamId + "/players")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + playerId + ")]").isEmpty());

        mockMvc.perform(get("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + playerId + ")]").isEmpty());

        // The shirt number is free for the next player.
        long nextPlayerId = createUser("ADMIN", playerJson(email("next"), parentId, teamId, 17));
        assertNotEquals(playerId, nextPlayerId);
    }

    @Test
    void adminPromotesPlayerAndClearsRosterFields() throws Exception {
        long teamId = createTeam("S1-8 Admin Promote " + UUID.randomUUID());
        long parentId = createUser("ADMIN", userJson("Parent", email("parent"), "PARENT"));
        long playerId = createUser("ADMIN", playerJson(email("player"), parentId, teamId, 18));

        mockMvc.perform(put("/api/users/" + playerId + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"COACH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("COACH"));

        mockMvc.perform(get("/api/users/" + playerId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("CHAIRMAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentId").value(nullValue()))
                .andExpect(jsonPath("$.playerNumber").value(nullValue()))
                .andExpect(jsonPath("$.teamId").value(nullValue()));
    }

    @Test
    void chairmanCannotAssignAdminOrChairman() throws Exception {
        long playerId = createUser("ADMIN", userJson("Soon Coach", email("player"), "COACH"));
        // A coach is the wrong starting role. ADMIN and CHAIRMAN are refused before that rule.
        expectRoleChangeForbidden(playerId, "ADMIN", CANNOT_ASSIGN_CLUB_LEAD);
        expectRoleChangeForbidden(playerId, "CHAIRMAN", CANNOT_ASSIGN_CLUB_LEAD);
        expectRoleChangeForbidden(playerId, "PLAYER", "CHAIRMAN may only change a PLAYER to COACH");
    }

    @Test
    void chairmanCannotChangeOwnRole() throws Exception {
        AppUser chairman = saveCaller("CHAIRMAN");

        mockMvc.perform(put("/api/users/" + chairman.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairman, "CHAIRMAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"COACH\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You cannot change your own role"));
    }

    @Test
    void adminCanChangeOwnRole() throws Exception {
        AppUser admin = saveCaller("ADMIN");

        mockMvc.perform(put("/api/users/" + admin.getId() + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin, "ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"COACH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("COACH"));
    }

    @Test
    void coachCannotChangeARole() throws Exception {
        long playerId = createUser("ADMIN", userJson("Player", email("player"), "PARENT"));

        mockMvc.perform(put("/api/users/" + playerId + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer("COACH"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"COACH\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));
    }

    private void expectCreateForbidden(String roleName, String message) throws Exception {
        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer("CHAIRMAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(userJson("Nope", email("nope"), roleName)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(message));
    }

    private void expectRoleChangeForbidden(long userId, String roleName, String message) throws Exception {
        mockMvc.perform(put("/api/users/" + userId + "/role")
                        .header(HttpHeaders.AUTHORIZATION, bearer("CHAIRMAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleName\":\"" + roleName + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(message));
    }

    private long createTeam(String teamName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, bearer("CHAIRMAN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + teamName + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return idOf(result);
    }

    private long createUser(String callerRole, String json) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(callerRole))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();
        return idOf(result);
    }

    private void expectUser(long userId, String roleName) throws Exception {
        mockMvc.perform(get("/api/users/" + userId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value(roleName));
    }

    private void expectCoachWithoutRoster(long userId) throws Exception {
        mockMvc.perform(get("/api/users/" + userId)
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roleName").value("COACH"))
                .andExpect(jsonPath("$.playerNumber").value(nullValue()))
                .andExpect(jsonPath("$.parentId").value(nullValue()))
                .andExpect(jsonPath("$.teamId").value(nullValue()));
    }

    private long idOf(MvcResult result) throws Exception {
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String bearer(String roleName) {
        return bearer(saveCaller(roleName), roleName);
    }

    private String bearer(AppUser user, String roleName) {
        String token = jwtService.createToken(user.getId(), user.getEmail(), roleName);
        return "Bearer " + token;
    }

    /**
     * The JWT filter accepts the token only when this row is active and the role matches.
     */
    private AppUser saveCaller(String roleName) {
        Role role = roleRepository.findByName(roleName).orElseThrow();
        AppUser user = new AppUser();
        user.setName(roleName + " tester");
        user.setEmail(roleName.toLowerCase() + "-" + UUID.randomUUID() + "@example.com");
        user.setRoleId(role.getId());
        user.setActive(true);
        user.setMustChangePassword(false);
        return userRepository.saveAndFlush(user);
    }

    private String email(String label) {
        return label + "-" + UUID.randomUUID() + "@fcvaxjo.se";
    }

    private String userJson(String name, String email, String roleName) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"roleName\":\"" + roleName + "\"}";
    }

    private String coachJson(String name, String email, int playerNumber) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email
                + "\",\"roleName\":\"COACH\",\"playerNumber\":" + playerNumber + "}";
    }

    private String playerJson(String email, long parentId, long teamId, int playerNumber) {
        return "{\"name\":\"Youth\",\"email\":\"" + email + "\",\"roleName\":\"PLAYER\","
                + "\"playerNumber\":" + playerNumber + ",\"parentId\":" + parentId
                + ",\"teamId\":" + teamId + "}";
    }
}
