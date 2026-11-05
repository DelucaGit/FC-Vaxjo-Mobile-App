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

import se.fcvaxjo.api.security.JwtService;

/**
 * Chairman may create a coach and turn a player into a coach.
 * The filter on this branch reads the role from the token, so a made-up user id is enough.
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

    @Test
    void chairmanAndAdminCanCreateACoach() throws Exception {
        String chairmanEmail = email("chair-coach");
        long chairmanCoachId = createUser("CHAIRMAN", userJson("Chair Coach", chairmanEmail, "COACH"));
        expectUser(chairmanCoachId, "COACH");

        String adminEmail = email("admin-coach");
        long adminCoachId = createUser("ADMIN", userJson("Admin Coach", adminEmail, "COACH"));
        expectUser(adminCoachId, "COACH");
    }

    @Test
    void chairmanCannotCreateAdminOrChairman() throws Exception {
        expectCreateForbidden("ADMIN", CANNOT_ASSIGN_CLUB_LEAD);
        expectCreateForbidden("CHAIRMAN", CANNOT_ASSIGN_CLUB_LEAD);
        expectCreateForbidden("PLAYER", "CHAIRMAN may only create a COACH");
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

    private long idOf(MvcResult result) throws Exception {
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String bearer(String roleName) {
        String token = jwtService.createToken(1L, roleName.toLowerCase() + "@fcvaxjo.se", roleName);
        return "Bearer " + token;
    }

    private String email(String label) {
        return label + "-" + UUID.randomUUID() + "@fcvaxjo.se";
    }

    private String userJson(String name, String email, String roleName) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"roleName\":\"" + roleName + "\"}";
    }

    private String playerJson(String email, long parentId, long teamId, int playerNumber) {
        return "{\"name\":\"Youth\",\"email\":\"" + email + "\",\"roleName\":\"PLAYER\","
                + "\"playerNumber\":" + playerNumber + ",\"parentId\":" + parentId
                + ",\"teamId\":" + teamId + "}";
    }
}
