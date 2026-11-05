package se.fcvaxjo.api.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

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
 * Calls the real HTTP API with JWTs.
 * A Mockito test cannot see {@code @PreAuthorize}, so the role gates are checked here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserAndTeamReadAccessTest {

    private static final String ADMIN_EMAIL = "read-access-admin@fcvaxjo.test";
    private static final String COACH_EMAIL = "read-access-coach@fcvaxjo.test";
    private static final String PLAYER_EMAIL = "read-access-player@fcvaxjo.test";
    private static final String OTHER_PLAYER_EMAIL = "read-access-other@fcvaxjo.test";
    private static final String PARENT_EMAIL = "read-access-parent@fcvaxjo.test";
    private static final String CHAIRMAN_EMAIL = "read-access-chairman@fcvaxjo.test";
    private static final String OTHER_TEAM_PLAYER_EMAIL = "read-access-p13@fcvaxjo.test";
    private static final String PARENT_PHONE = "0700000201";
    private static final String OTHER_PLAYER_PHONE = "0700000202";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamCoachRepository teamCoachRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    private Long teamId;
    private Long otherTeamId;
    private Long adminId;
    private Long coachId;
    private Long playerId;
    private Long otherPlayerId;
    private Long otherTeamPlayerId;
    private Long parentId;

    private String adminToken;
    private String coachToken;
    private String playerToken;
    private String parentToken;
    private String chairmanToken;

    @BeforeEach
    void insertClub() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.execute(status -> {
            deleteRowsFromEarlierRun();

            Role adminRole = roleByName("ADMIN");
            Role chairmanRole = roleByName("CHAIRMAN");
            Role coachRole = roleByName("COACH");
            Role playerRole = roleByName("PLAYER");
            Role parentRole = roleByName("PARENT");

            Team team = new Team();
            team.setName("Read Access P15");
            team = teamRepository.save(team);
            teamId = team.getId();

            Team otherTeam = new Team();
            otherTeam.setName("Read Access P13");
            otherTeam = teamRepository.save(otherTeam);
            otherTeamId = otherTeam.getId();

            AppUser admin = saveUser("Admin", ADMIN_EMAIL, adminRole, null, null, null, null);
            AppUser chairman = saveUser("Chairman", CHAIRMAN_EMAIL, chairmanRole, null, "0700000199", null, null);
            AppUser coach = saveUser("Coach", COACH_EMAIL, coachRole, null, "0700000200", null, null);
            AppUser parent = saveUser("Parent", PARENT_EMAIL, parentRole, null, PARENT_PHONE, null, null);
            AppUser player = saveUser("Player", PLAYER_EMAIL, playerRole, 71, "0700000211", parent.getId(), teamId);
            AppUser otherPlayer = saveUser(
                    "Other Player", OTHER_PLAYER_EMAIL, playerRole, 72, OTHER_PLAYER_PHONE, parent.getId(), teamId);
            AppUser otherTeamPlayer = saveUser(
                    "P13 Player", OTHER_TEAM_PLAYER_EMAIL, playerRole, 73, "0700000213", parent.getId(), otherTeamId);

            TeamCoach link = new TeamCoach();
            link.setTeamId(teamId);
            link.setUserId(coach.getId());
            teamCoachRepository.save(link);

            chairmanToken = jwtService.createToken(chairman.getId(), CHAIRMAN_EMAIL, "CHAIRMAN");

            adminId = admin.getId();
            coachId = coach.getId();
            parentId = parent.getId();
            playerId = player.getId();
            otherPlayerId = otherPlayer.getId();
            otherTeamPlayerId = otherTeamPlayer.getId();

            adminToken = jwtService.createToken(adminId, ADMIN_EMAIL, "ADMIN");
            coachToken = jwtService.createToken(coachId, COACH_EMAIL, "COACH");
            playerToken = jwtService.createToken(playerId, PLAYER_EMAIL, "PLAYER");
            parentToken = jwtService.createToken(parentId, PARENT_EMAIL, "PARENT");
            return null;
        });
    }

    @AfterEach
    void removeClub() {
        transactionTemplate.execute(status -> {
            deleteRowsFromEarlierRun();
            return null;
        });
    }

    @Test
    void missingTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void playerAndParentCannotListOrSearchUsers() throws Exception {
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access Denied"));

        expectForbidden(parentToken, "/api/users");
        expectForbidden(playerToken, "/api/users/search?name=Player");
        expectForbidden(parentToken, "/api/users/search?name=Player");
        expectForbidden(playerToken, "/api/users/search?number=71");
        expectForbidden(parentToken, "/api/users/search?number=72");
        expectForbidden(playerToken, "/api/users/search?phone=" + OTHER_PLAYER_PHONE);
        expectForbidden(parentToken, "/api/users/search?phone=" + PARENT_PHONE);
    }

    @Test
    void playerAndParentCannotReadSomeoneElse() throws Exception {
        mockMvc.perform(get("/api/users/" + otherPlayerId).header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only read your own user record"));

        expectForbidden(playerToken, "/api/users/" + parentId);
        // The child is another person, even when the caller is their parent.
        expectForbidden(parentToken, "/api/users/" + playerId);
        // 403 before 404: a missing id must not tell them the row is absent.
        expectForbidden(playerToken, "/api/users/999999");
    }

    @Test
    void playerAndParentCanReadTheirOwnProfile() throws Exception {
        mockMvc.perform(get("/api/users/" + playerId).header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(playerId))
                .andExpect(jsonPath("$.email").value(PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/" + parentId).header(HttpHeaders.AUTHORIZATION, bearer(parentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(parentId))
                .andExpect(jsonPath("$.email").value(PARENT_EMAIL));
    }

    @Test
    void adminListsTheClubAndCoachStaysOnOwnTeam() throws Exception {
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", hasItem(PLAYER_EMAIL)));

        // The whole club list is ADMIN and CHAIRMAN. A coach uses the team roster.
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/users/search?name=Other")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(OTHER_PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/search?name=P13")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/users/search?number=72")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(OTHER_PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/search?phone=" + OTHER_PLAYER_PHONE)
                        .header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(PARENT_PHONE));

        mockMvc.perform(get("/api/users/" + otherPlayerId).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(OTHER_PLAYER_EMAIL))
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(PARENT_PHONE));

        mockMvc.perform(get("/api/users/" + playerId).header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/" + otherTeamPlayerId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminStillGetsNotFoundForAMissingUser() throws Exception {
        mockMvc.perform(get("/api/users/999999").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    @Test
    void playerAndParentCannotListTeamCoachesOrPlayers() throws Exception {
        expectForbidden(playerToken, "/api/teams/" + teamId + "/coaches");
        expectForbidden(parentToken, "/api/teams/" + teamId + "/coaches");
        expectForbidden(playerToken, "/api/teams/" + teamId + "/players");
        expectForbidden(parentToken, "/api/teams/" + teamId + "/players");
        // The role check runs before "team not found".
        expectForbidden(playerToken, "/api/teams/999999/players");
    }

    @Test
    void adminAndCoachCanStillListTeamCoachesAndPlayers() throws Exception {
        mockMvc.perform(get("/api/teams/" + teamId + "/players")
                        .header(HttpHeaders.AUTHORIZATION, bearer(coachToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", hasItem(OTHER_PLAYER_EMAIL)))
                .andExpect(jsonPath("$[*].parentMobilePhoneNumber", hasItem(PARENT_PHONE)));

        mockMvc.perform(get("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(COACH_EMAIL));

        expectForbidden(coachToken, "/api/teams/" + otherTeamId + "/players");
        expectForbidden(coachToken, "/api/teams/" + otherTeamId + "/coaches");
    }

    @Test
    void chairmanCanReadUsersAndATeamTheyAreNotLinkedTo() throws Exception {
        // No team_coaches row for the chairman. The read is still allowed on both teams.
        mockMvc.perform(get("/api/users").header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", hasItem(OTHER_TEAM_PLAYER_EMAIL)));

        mockMvc.perform(get("/api/users/search?name=P13")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(OTHER_TEAM_PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/search?number=73")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(OTHER_TEAM_PLAYER_EMAIL));

        mockMvc.perform(get("/api/users/search?phone=0700000213")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(PARENT_PHONE));

        mockMvc.perform(get("/api/users/" + otherPlayerId).header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(OTHER_PLAYER_EMAIL));

        mockMvc.perform(get("/api/teams/" + otherTeamId + "/players")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email", hasItem(OTHER_TEAM_PLAYER_EMAIL)))
                .andExpect(jsonPath("$[*].parentMobilePhoneNumber", hasItem(PARENT_PHONE)));

        mockMvc.perform(get("/api/teams/" + teamId + "/coaches")
                        .header(HttpHeaders.AUTHORIZATION, bearer(chairmanToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(COACH_EMAIL));
    }

    @Test
    void playerCanStillListTeamNames() throws Exception {
        // Id and name are not contact details, so this URL stays open to every logged-in role.
        mockMvc.perform(get("/api/teams").header(HttpHeaders.AUTHORIZATION, bearer(playerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("Read Access P15")));

        mockMvc.perform(get("/api/teams/" + teamId).header(HttpHeaders.AUTHORIZATION, bearer(parentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Read Access P15"));
    }

    private void expectForbidden(String token, String path) throws Exception {
        mockMvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isForbidden());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private Role roleByName(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Missing role " + name));
    }

    private AppUser saveUser(String name, String email, Role role, Integer shirtNumber, String phone,
            Long parentId, Long teamIdForUser) {
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(role.getId());
        user.setPlayerNumber(shirtNumber);
        user.setMobilePhoneNumber(phone);
        user.setParentId(parentId);
        user.setTeamId(teamIdForUser);
        user.setActive(true);
        user.setMustChangePassword(true);
        return userRepository.save(user);
    }

    private void deleteRowsFromEarlierRun() {
        deleteTeamNamed("Read Access P15");
        deleteTeamNamed("Read Access P13");
        deleteUserByEmail(OTHER_TEAM_PLAYER_EMAIL);
        deleteUserByEmail(OTHER_PLAYER_EMAIL);
        deleteUserByEmail(PLAYER_EMAIL);
        deleteUserByEmail(PARENT_EMAIL);
        deleteUserByEmail(COACH_EMAIL);
        deleteUserByEmail(CHAIRMAN_EMAIL);
        deleteUserByEmail(ADMIN_EMAIL);
    }

    private void deleteTeamNamed(String name) {
        teamRepository.findByName(name).ifPresent(team -> {
            for (TeamCoach link : teamCoachRepository.findByTeamId(team.getId())) {
                teamCoachRepository.delete(link);
            }
            teamRepository.delete(team);
        });
    }

    private void deleteUserByEmail(String email) {
        userRepository.findByEmail(email).ifPresent(userRepository::delete);
    }
}
