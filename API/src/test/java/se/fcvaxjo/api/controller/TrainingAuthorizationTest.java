package se.fcvaxjo.api.controller;

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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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
 * The login filter looks the person up. Each token uses a real active user,
 * and the role in the token is that user's role. A made-up id would be rejected.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TrainingAuthorizationTest {

    private static final String STAFF_DENIED =
            "Only ADMIN, CHAIRMAN, or a coach of this team can manage trainings";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamCoachRepository teamCoachRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void chairmanCanCreateAndUpdateAttendanceOnAnyTeam() throws Exception {
        AppUser chairman = saveUser("CHAIRMAN");
        Team team = saveTeam("S1-11 Chairman");
        AppUser player = savePlayer(team, "Nora");

        MvcResult created = mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairman))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(team.getId(), "Chairman evening")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Chairman evening"))
                .andExpect(jsonPath("$.teamId").value(team.getId()))
                .andExpect(jsonPath("$.createdByUserId").value(chairman.getId()))
                .andReturn();

        long trainingId = readId(created);
        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance/" + player.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairman))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PRESENT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerUserId").value(player.getId()))
                .andExpect(jsonPath("$.status").value("PRESENT"));
    }

    @Test
    void playerAndParentCannotCreateOrUpdateTrainings() throws Exception {
        AppUser chairman = saveUser("CHAIRMAN");
        AppUser player = saveUser("PLAYER");
        AppUser parent = saveUser("PARENT");
        Team team = saveTeam("S1-11 Members");
        player.setTeamId(team.getId());
        userRepository.saveAndFlush(player);

        MvcResult created = mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairman))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(team.getId(), "Members evening")))
                .andExpect(status().isCreated())
                .andReturn();
        long trainingId = readId(created);

        expectRoleDenied(player, team.getId(), trainingId, player.getId());
        expectRoleDenied(parent, team.getId(), trainingId, player.getId());
    }

    @Test
    void coachCanManageOwnTeamButNotAnotherTeam() throws Exception {
        AppUser coach = saveUser("COACH");
        AppUser chairman = saveUser("CHAIRMAN");
        Team ownTeam = saveTeam("S1-11 Own");
        Team otherTeam = saveTeam("S1-11 Other");
        AppUser ownPlayer = savePlayer(ownTeam, "Erik");
        AppUser otherPlayer = savePlayer(otherTeam, "Maja");
        linkCoach(ownTeam, coach);

        MvcResult ownTraining = mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(ownTeam.getId(), "Own team")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdByUserId").value(coach.getId()))
                .andReturn();

        mockMvc.perform(put("/api/trainings/" + readId(ownTraining) + "/attendance/" + ownPlayer.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"EXCUSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXCUSED"));

        mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(otherTeam.getId(), "Not my team")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(STAFF_DENIED));

        MvcResult otherTraining = mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairman))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(otherTeam.getId(), "Other team")))
                .andExpect(status().isCreated())
                .andReturn();

        mockMvc.perform(put("/api/trainings/" + readId(otherTraining) + "/attendance/" + otherPlayer.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(coach))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ABSENT\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(STAFF_DENIED));
    }

    // @PreAuthorize rejects PLAYER and PARENT before the service runs.
    private void expectRoleDenied(AppUser caller, long teamId, long trainingId, long playerId) throws Exception {
        mockMvc.perform(post("/api/trainings")
                        .header(HttpHeaders.AUTHORIZATION, bearer(caller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(trainingJson(teamId, "Should fail")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));

        mockMvc.perform(put("/api/trainings/" + trainingId + "/attendance/" + playerId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(caller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PRESENT\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));
    }

    private AppUser saveUser(String roleName) {
        Role role = roleRepository.findByName(roleName).orElseThrow();
        AppUser user = new AppUser();
        user.setName(roleName + " tester");
        user.setEmail(roleName.toLowerCase() + "-" + UUID.randomUUID() + "@example.com");
        user.setRoleId(role.getId());
        user.setActive(true);
        user.setMustChangePassword(false);
        return userRepository.saveAndFlush(user);
    }

    private AppUser savePlayer(Team team, String name) {
        AppUser player = saveUser("PLAYER");
        player.setName(name);
        player.setTeamId(team.getId());
        return userRepository.saveAndFlush(player);
    }

    private Team saveTeam(String name) {
        Team team = new Team();
        team.setName(name + " " + UUID.randomUUID());
        return teamRepository.saveAndFlush(team);
    }

    private void linkCoach(Team team, AppUser coach) {
        TeamCoach link = new TeamCoach();
        link.setTeamId(team.getId());
        link.setUserId(coach.getId());
        teamCoachRepository.saveAndFlush(link);
    }

    private String bearer(AppUser user) {
        String roleName = roleRepository.findById(user.getRoleId()).orElseThrow().getName();
        String token = jwtService.createToken(user.getId(), user.getEmail(), roleName);
        return "Bearer " + token;
    }

    private String trainingJson(long teamId, String title) {
        return "{"
                + "\"teamId\":" + teamId + ","
                + "\"startsAt\":\"2099-11-06T18:00:00\","
                + "\"endsAt\":\"2099-11-06T19:30:00\","
                + "\"title\":\"" + title + "\""
                + "}";
    }

    private long readId(MvcResult result) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("id").asLong();
    }
}
