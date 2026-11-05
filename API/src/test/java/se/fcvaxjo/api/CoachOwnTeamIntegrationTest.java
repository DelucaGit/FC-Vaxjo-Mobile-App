package se.fcvaxjo.api;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.NewParentRequest;
import se.fcvaxjo.api.DTO.UpdatePlayerRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Checks the coach team rule through HTTP, not only the service.
 * A mocked repository can say "denied" while the filter or the saved row still does the wrong thing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CoachOwnTeamIntegrationTest {

    private static final String NOT_THIS_TEAM =
            "Only ADMIN or a coach of this team can manage its players";

    private static final String STANDALONE_PARENT_DENIED =
            "A COACH cannot create a standalone parent. Create the parent together with a player on a team you train";

    @Autowired
    private MockMvc mockMvc;

    /** Builds the request JSON. The running app reads it with its own mapper. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamCoachRepository teamCoachRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Team ownTeam;
    private Team otherTeam;
    private AppUser admin;
    private AppUser coach;
    private AppUser parent;
    private AppUser playerOnOwnTeam;
    private AppUser playerOnOtherTeam;

    @BeforeEach
    void setUpClub() {
        ownTeam = saveTeam("P15");
        otherTeam = saveTeam("P13");

        admin = saveUser("Club Admin", "admin-s13@fcvaxjo.se", "ADMIN", null, null, null);
        coach = saveUser("Coach P15", "coach-s13@fcvaxjo.se", "COACH", null, null, null);
        parent = saveUser("Parent", "parent-s13@fcvaxjo.se", "PARENT", null, null, null);
        playerOnOwnTeam = saveUser("Own Player", "own-s13@fcvaxjo.se", "PLAYER", ownTeam.getId(), parent.getId(), 15);
        playerOnOtherTeam = saveUser(
                "Other Player", "other-s13@fcvaxjo.se", "PLAYER", otherTeam.getId(), parent.getId(), 13);

        // Coaches are linked in team_coaches. users.team_id is only for players.
        TeamCoach link = new TeamCoach();
        link.setTeamId(ownTeam.getId());
        link.setUserId(coach.getId());
        teamCoachRepository.save(link);
    }

    @Test
    void coachCreatesPlayerOnOwnTeam() throws Exception {
        CreateUserRequest body = playerRequest("New Kid", "new-kid@fcvaxjo.se", ownTeam.getId(), parent.getId());

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roleName").value("PLAYER"))
                .andExpect(jsonPath("$.teamId").value(ownTeam.getId()))
                .andExpect(jsonPath("$.parentId").value(parent.getId()));

        assertTrue(userRepository.findByEmail("new-kid@fcvaxjo.se").isPresent());
    }

    @Test
    void coachCannotCreateStandaloneParent() throws Exception {
        CreateUserRequest body = new CreateUserRequest();
        body.setName("New Parent");
        body.setEmail("new-parent@fcvaxjo.se");
        body.setRoleName("PARENT");
        body.setMobilePhoneNumber("0701000001");

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(STANDALONE_PARENT_DENIED));

        assertTrue(userRepository.findByEmail("new-parent@fcvaxjo.se").isEmpty());
    }

    @Test
    void adminCreatesStandaloneParent() throws Exception {
        CreateUserRequest body = new CreateUserRequest();
        body.setName("Club Parent");
        body.setEmail("club-parent@fcvaxjo.se");
        body.setRoleName("PARENT");
        body.setMobilePhoneNumber("0701000009");

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roleName").value("PARENT"))
                .andExpect(jsonPath("$.teamId").value(nullValue()));

        AppUser created = userRepository.findByEmail("club-parent@fcvaxjo.se").orElseThrow();
        assertEquals(roleId("PARENT"), created.getRoleId());
        assertNull(created.getParentId());
    }

    @Test
    void coachCreatesPlayerAndParentOnOwnTeam() throws Exception {
        CreateUserRequest body = playerRequest("Kid With Parent", "kid-parent@fcvaxjo.se", ownTeam.getId(), null);
        NewParentRequest newParent = new NewParentRequest();
        newParent.setName("Fresh Parent");
        newParent.setEmail("fresh-parent@fcvaxjo.se");
        newParent.setMobilePhoneNumber("0701000002");
        body.setNewParent(newParent);

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teamId").value(ownTeam.getId()))
                .andExpect(jsonPath("$.parentTemporaryPassword").isNotEmpty());

        assertTrue(userRepository.findByEmail("fresh-parent@fcvaxjo.se").isPresent());
        AppUser kid = userRepository.findByEmail("kid-parent@fcvaxjo.se").orElseThrow();
        AppUser freshParent = userRepository.findByEmail("fresh-parent@fcvaxjo.se").orElseThrow();
        // The parent exists only because this child on the coach's team points at them.
        assertEquals(freshParent.getId(), kid.getParentId());
        assertEquals(ownTeam.getId(), kid.getTeamId());
    }

    @Test
    void coachCannotCreatePlayerOnAnotherTeam() throws Exception {
        CreateUserRequest body = playerRequest("Stray Kid", "stray@fcvaxjo.se", otherTeam.getId(), parent.getId());

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(NOT_THIS_TEAM));

        assertTrue(userRepository.findByEmail("stray@fcvaxjo.se").isEmpty());
    }

    @Test
    void coachCannotCreateParentAsSideEffectOfAnotherTeam() throws Exception {
        CreateUserRequest body = playerRequest("Stray Kid", "stray2@fcvaxjo.se", otherTeam.getId(), null);
        NewParentRequest newParent = new NewParentRequest();
        newParent.setName("Should Not Exist");
        newParent.setEmail("should-not@fcvaxjo.se");
        newParent.setMobilePhoneNumber("0701000003");
        body.setNewParent(newParent);

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isForbidden());

        // The team check happens before the insert, so neither person is stored.
        assertTrue(userRepository.findByEmail("stray2@fcvaxjo.se").isEmpty());
        assertTrue(userRepository.findByEmail("should-not@fcvaxjo.se").isEmpty());
    }

    @Test
    void coachRemovesPlayerFromOwnTeam() throws Exception {
        mockMvc.perform(delete("/api/users/" + playerOnOwnTeam.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach)))
                .andExpect(status().isNoContent());

        AppUser stored = userRepository.findById(playerOnOwnTeam.getId()).orElseThrow();
        assertFalse(stored.isActive());
    }

    @Test
    void coachCannotRemovePlayerFromAnotherTeam() throws Exception {
        mockMvc.perform(delete("/api/users/" + playerOnOtherTeam.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(NOT_THIS_TEAM));

        AppUser stored = userRepository.findById(playerOnOtherTeam.getId()).orElseThrow();
        assertTrue(stored.isActive());
    }

    @Test
    void adminKeepsAccessToEveryTeam() throws Exception {
        CreateUserRequest body = playerRequest("Admin Kid", "admin-kid@fcvaxjo.se", otherTeam.getId(), parent.getId());

        mockMvc.perform(post("/api/users")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teamId").value(otherTeam.getId()));

        mockMvc.perform(delete("/api/users/" + playerOnOtherTeam.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());

        assertFalse(userRepository.findById(playerOnOtherTeam.getId()).orElseThrow().isActive());
    }

    @Test
    void coachCanEditPlayerOnOwnTeam() throws Exception {
        UpdatePlayerRequest body = updateRequest("Own Player Renamed", "own-s13@fcvaxjo.se", ownTeam.getId());

        mockMvc.perform(put("/api/users/" + playerOnOwnTeam.getId() + "/player")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Own Player Renamed"))
                .andExpect(jsonPath("$.teamId").value(ownTeam.getId()));
    }

    @Test
    void coachCannotEditPlayerOnAnotherTeam() throws Exception {
        UpdatePlayerRequest body = updateRequest("Renamed", "other-s13@fcvaxjo.se", otherTeam.getId());

        mockMvc.perform(put("/api/users/" + playerOnOtherTeam.getId() + "/player")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(NOT_THIS_TEAM));

        assertEquals("Other Player", userRepository.findById(playerOnOtherTeam.getId()).orElseThrow().getName());
    }

    @Test
    void coachCannotMoveOwnPlayerToAnotherTeam() throws Exception {
        UpdatePlayerRequest body = updateRequest("Own Player", "own-s13@fcvaxjo.se", otherTeam.getId());

        mockMvc.perform(put("/api/users/" + playerOnOwnTeam.getId() + "/player")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isForbidden());

        assertEquals(ownTeam.getId(), userRepository.findById(playerOnOwnTeam.getId()).orElseThrow().getTeamId());
    }

    private CreateUserRequest playerRequest(String name, String email, Long teamId, Long parentId) {
        CreateUserRequest body = new CreateUserRequest();
        body.setName(name);
        body.setEmail(email);
        body.setRoleName("PLAYER");
        body.setTeamId(teamId);
        body.setParentId(parentId);
        return body;
    }

    private UpdatePlayerRequest updateRequest(String name, String email, Long teamId) {
        UpdatePlayerRequest body = new UpdatePlayerRequest();
        body.setName(name);
        body.setEmail(email);
        body.setTeamId(teamId);
        return body;
    }

    private String bearer(AppUser user) {
        String roleName = roleRepository.findById(user.getRoleId()).orElseThrow().getName();
        return "Bearer " + jwtService.createToken(user.getId(), user.getEmail(), roleName);
    }

    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private Team saveTeam(String name) {
        Team team = new Team();
        team.setName(name);
        return teamRepository.save(team);
    }

    private AppUser saveUser(String name, String email, String roleName, Long teamId, Long parentId, Integer shirt) {
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(roleId(roleName));
        user.setTeamId(teamId);
        user.setParentId(parentId);
        user.setPlayerNumber(shirt);
        user.setActive(true);
        user.setMustChangePassword(true);
        // The hash is only here so the row is valid. These tests log in with a JWT, not this password.
        user.setPasswordHash(passwordEncoder.encode("unused"));
        return userRepository.save(user);
    }

    private Long roleId(String roleName) {
        Role role = roleRepository.findByName(roleName).orElseThrow();
        return role.getId();
    }
}
