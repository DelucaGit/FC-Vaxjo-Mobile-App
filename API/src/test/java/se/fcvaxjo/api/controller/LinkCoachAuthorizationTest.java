package se.fcvaxjo.api.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Each caller is a saved, active user, and the token is issued for that row.
 * A made-up user id is rejected once the login filter checks the account.
 * The person being linked is a different COACH row, because addCoach checks
 * that role in the database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional // undo the teams, the coach, and the callers this test inserts
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

    // The token names this saved row, and the role in the token is the role
    // stored on the user. A fixed id such as 1 is rejected when the login
    // filter loads the account and checks that it is still active.
    private String bearer(String roleName) {
        Role role = roleRepository.findByName(roleName).orElseThrow();
        AppUser user = new AppUser();
        user.setName(roleName + " tester");
        user.setEmail(roleName.toLowerCase() + "-" + UUID.randomUUID() + "@example.com");
        user.setRoleId(role.getId());
        user.setActive(true);
        user.setMustChangePassword(false);
        AppUser saved = userRepository.saveAndFlush(user);

        String token = jwtService.createToken(saved.getId(), saved.getEmail(), roleName);
        return "Bearer " + token;
    }
}
