package se.fcvaxjo.api.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * The login filter reads the role from the token. It does not load the user.
 * A made-up user id is enough to prove who may create a team.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // undo the teams this test inserts, so a local database stays clean
class CreateTeamAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    void chairmanRoleIsStored() {
        String name = roleRepository.findByName("CHAIRMAN")
                .orElseThrow()
                .getName();
        assertEquals(ClubRole.CHAIRMAN.name(), name);
    }

    @Test
    void adminAndChairmanCanCreateATeam() throws Exception {
        createTeam("ADMIN", "S1-2 Admin United");
        createTeam("CHAIRMAN", "S1-2 Chairman United");
    }

    @Test
    void coachPlayerAndParentCannotCreateATeam() throws Exception {
        expectForbidden("COACH", "S1-2 Coach United");
        expectForbidden("PLAYER", "S1-2 Player United");
        expectForbidden("PARENT", "S1-2 Parent United");
    }

    private void createTeam(String roleName, String teamName) throws Exception {
        mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamJson(teamName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(teamName))
                .andExpect(jsonPath("$.id").isNumber());
    }

    // @PreAuthorize rejects the call before createTeam runs.
    // The JSON message is Spring's own text, "Access Denied".
    private void expectForbidden(String roleName, String teamName) throws Exception {
        mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamJson(teamName)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));
    }

    private String bearer(String roleName) {
        String email = roleName.toLowerCase() + "@fcvaxjo.se";
        String token = jwtService.createToken(1L, email, roleName);
        return "Bearer " + token;
    }

    private String teamJson(String teamName) {
        return "{\"name\":\"" + teamName + "\"}";
    }
}
