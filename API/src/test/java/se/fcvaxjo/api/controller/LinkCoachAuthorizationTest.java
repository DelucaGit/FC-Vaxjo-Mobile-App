package se.fcvaxjo.api.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
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
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Who may link a coach is read from the token, same as create-team.
 * The coach row is real because addCoach checks the role in the database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // undo the teams and the coach this test inserts
class LinkCoachAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    private long coachUserId;

    @BeforeEach
    void saveACoach() {
        AppUser coach = new AppUser();
        coach.setName("S1-7 Coach");
        coach.setEmail("s1-7-coach@fcvaxjo.se");
        coach.setRoleId(roleRepository.findByName("COACH").orElseThrow().getId());
        coach.setActive(true);
        coachUserId = userRepository.save(coach).getId();
    }

    @Test
    void adminAndChairmanCanLinkAndUnlinkACoachOnEveryTeam() throws Exception {
        // Two teams, and the two roles swap who links and who unlinks.
        // The rule is every team, not one team the chairman happens to own.
        long north = createTeam("S1-7 North");
        long south = createTeam("S1-7 South");

        linkCoach("ADMIN", north);
        linkCoach("CHAIRMAN", south);

        unlinkCoach("CHAIRMAN", north);
        unlinkCoach("ADMIN", south);

        expectCoachAbsent(north);
        expectCoachAbsent(south);
    }

    @Test
    void coachPlayerAndParentCannotLinkOrUnlinkACoach() throws Exception {
        long teamId = createTeam("S1-7 Closed");

        expectForbidden("COACH", teamId);
        expectForbidden("PLAYER", teamId);
        expectForbidden("PARENT", teamId);

        // The refused calls must not leave a link behind.
        expectCoachAbsent(teamId);
    }

    private long createTeam(String teamName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + teamName + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }

    private void linkCoach(String roleName, long teamId) throws Exception {
        mockMvc.perform(post("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":" + coachUserId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(coachUserId))
                .andExpect(jsonPath("$.roleName").value("COACH"));
    }

    private void unlinkCoach(String roleName, long teamId) throws Exception {
        mockMvc.perform(delete("/api/teams/" + teamId + "/coaches/" + coachUserId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName)))
                .andExpect(status().isNoContent());
    }

    // @PreAuthorize rejects the call before addCoach or removeCoach runs.
    // The JSON message is Spring's own text, "Access Denied".
    private void expectForbidden(String roleName, long teamId) throws Exception {
        mockMvc.perform(post("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":" + coachUserId + "}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));

        mockMvc.perform(delete("/api/teams/" + teamId + "/coaches/" + coachUserId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(roleName)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));
    }

    private void expectCoachAbsent(long teamId) throws Exception {
        mockMvc.perform(get("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    private String bearer(String roleName) {
        String email = roleName.toLowerCase() + "@fcvaxjo.se";
        String token = jwtService.createToken(1L, email, roleName);
        return "Bearer " + token;
    }
}
