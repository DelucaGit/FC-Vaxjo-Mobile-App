package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import se.fcvaxjo.api.DTO.NewParentRequest;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String NOT_THIS_TEAM =
            "Only ADMIN, CHAIRMAN, or a coach of this team can manage its players";

    private static final String STANDALONE_PARENT_DENIED =
            "A COACH cannot create a standalone parent. Create the parent together with a player on a team you train";

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamCoachRepository teamCoachRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setAdminAuth() {
        login(1L, "ADMIN");
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private void login(Long userId, String roleName) {
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void searchByPlayerNumber_returnsUser() {
        AppUser erik = new AppUser();
        erik.setId(1L);
        erik.setName("Erik");
        erik.setPlayerNumber(7);
        erik.setActive(true);

        when(userRepository.findByPlayerNumber(7)).thenReturn(Optional.of(erik));

        AppUser result = userService.searchByPlayerNumber(7);

        assertEquals("Erik", result.getName());
        assertEquals(7, result.getPlayerNumber());
    }

    @Test
    void searchByPlayerNumber_throwsWhenMissing() {
        when(userRepository.findByPlayerNumber(99)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.searchByPlayerNumber(99));
    }

    @Test
    void searchByPlayerNumber_throwsWhenNull() {
        assertThrows(BadRequestException.class,
                () -> userService.searchByPlayerNumber(null));
    }

    @Test
    void createPlayer_withoutParent_throws() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));

        assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, null, null, 1L));
    }

    @Test
    void createPlayer_withoutTeam_throws() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, null));

        assertEquals("A PLAYER needs a teamId", error.getMessage());
    }

    @Test
    void createPlayer_withExistingParentAndTeam_setsPasswordFlags() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");

        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");

        AppUser parent = new AppUser();
        parent.setId(20L);
        parent.setName("Parent One");
        parent.setRoleId(4L);

        Team team = new Team();
        team.setId(1L);
        team.setName("P15");

        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));
        when(userRepository.findById(20L)).thenReturn(Optional.of(parent));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(parentRole));
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findByEmail("kid@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(30L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, 1L);

        assertEquals(30L, result.getUser().getId());
        assertEquals(20L, result.getUser().getParentId());
        assertEquals(1L, result.getUser().getTeamId());
        assertTrue(result.getUser().isMustChangePassword());
        assertEquals("hashed-temp", result.getUser().getPasswordHash());
        assertNotNull(result.getTemporaryPassword());
        assertFalse(result.getTemporaryPassword().isBlank());
    }

    @Test
    void createCoach_asCoachRole_isForbidden() {
        login(2L, "COACH");

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Other Coach", "coach2@fcvaxjo.se", "COACH", null, null, null, null, null));

        assertEquals(
                "Only ADMIN, CHAIRMAN or COACH can create users. A CHAIRMAN may create PLAYER, PARENT and COACH. A COACH may only create PLAYER",
                error.getMessage());
    }

    @Test
    void createPlayer_newParentMissingPhone_throws() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));

        NewParentRequest newParent = new NewParentRequest();
        newParent.setName("Parent Two");
        newParent.setEmail("parent2@fcvaxjo.se");
        newParent.setMobilePhoneNumber("  ");

        assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid2", "kid2@fcvaxjo.se", "PLAYER", null, null, null, newParent, 1L));
    }

    @Test
    void softDeletePlayer_setsInactive() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");

        AppUser player = new AppUser();
        player.setId(30L);
        player.setRoleId(3L);
        player.setActive(true);

        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.softDeletePlayer(30L);

        assertEquals(false, result.isActive());
    }

    @Test
    void updatePlayer_rejectsNullTeam() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");

        AppUser player = new AppUser();
        player.setId(30L);
        player.setRoleId(3L);
        player.setActive(true);
        player.setTeamId(1L);

        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole));

        assertThrows(BadRequestException.class,
                () -> userService.updatePlayer(
                        30L, "Kid", "kid@fcvaxjo.se", null, 7, null, null, null, null, null));
    }

    @Test
    void createStandaloneParent_asCoach_isBadRequest() {
        // Decision (b): a coach parent that is not tied to a player on their team is 400, not 403.
        login(2L, "COACH");

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Parent", "parent@fcvaxjo.se", "PARENT", null, "0701111111", null, null, null));

        assertEquals(STANDALONE_PARENT_DENIED, error.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void createStandaloneParent_asAdmin_isAllowed() {
        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");

        when(roleRepository.findByName("PARENT")).thenReturn(Optional.of(parentRole));
        when(userRepository.findByEmail("parent@fcvaxjo.se")).thenReturn(Optional.empty());
        when(userRepository.findByMobilePhoneNumber("0701111111")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(40L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Parent", "parent@fcvaxjo.se", "PARENT", null, "0701111111", null, null, null);

        assertEquals(4L, result.getUser().getRoleId());
        assertNull(result.getUser().getTeamId());
        assertNotNull(result.getTemporaryPassword());
        assertNotNull(result.getUser().getPasswordChangedAt());
    }

    @Test
    void createStandaloneParent_asChairman_isAllowed() {
        login(4L, "CHAIRMAN");

        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");
        when(roleRepository.findByName("PARENT")).thenReturn(Optional.of(parentRole));
        when(userRepository.findByEmail("chair-parent@fcvaxjo.se")).thenReturn(Optional.empty());
        when(userRepository.findByMobilePhoneNumber("0701222222")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Chair Parent", "chair-parent@fcvaxjo.se", "PARENT", null, "0701222222", null, null, null);

        assertEquals(4L, result.getUser().getRoleId());
        assertNull(result.getUser().getTeamId());
    }

    @Test
    void createPlayer_asChairman_doesNotNeedATeamLink() {
        login(4L, "CHAIRMAN");
        stubPlayerRoleAndParent();
        stubTeam(9L);
        when(userRepository.findByEmail("kid@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(31L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, 9L);

        assertEquals(9L, result.getUser().getTeamId());
        verify(teamCoachRepository, never()).existsByTeamIdAndUserId(any(), any());
    }

    @Test
    void createCoach_asChairman_clearsShirtNumber() {
        login(4L, "CHAIRMAN");
        Role coachRole = new Role();
        coachRole.setId(2L);
        coachRole.setName("COACH");
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(coachRole));
        when(userRepository.findByEmail("new-coach@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(40L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "New Coach", "new-coach@fcvaxjo.se", "COACH", 7, null, 20L, null, 1L);

        assertEquals(2L, result.getUser().getRoleId());
        assertNull(result.getUser().getParentId());
        assertNull(result.getUser().getTeamId());
        assertNull(result.getUser().getPlayerNumber());
    }

    @Test
    void createAdmin_asChairman_isForbidden() {
        login(4L, "CHAIRMAN");

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Boss", "boss@fcvaxjo.se", "ADMIN", null, null, null, null, null));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", error.getMessage());
    }

    @Test
    void createChairman_asChairman_isForbidden() {
        login(4L, "CHAIRMAN");

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Other Chair", "chair2@fcvaxjo.se", "CHAIRMAN", null, null, null, null, null));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", error.getMessage());
    }

    @Test
    void softDeletePlayer_asChairman_anyTeam() {
        login(4L, "CHAIRMAN");

        AppUser player = activePlayerOnTeam(30L, 9L);
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.softDeletePlayer(30L);

        assertFalse(result.isActive());
        verify(teamCoachRepository, never()).existsByTeamIdAndUserId(any(), any());
    }

    @Test
    void createPlayer_asCoachOfThatTeam_isAllowed() {
        login(2L, "COACH");
        stubPlayerRoleAndParent();
        stubTeam(1L);
        when(teamCoachRepository.existsByTeamIdAndUserId(1L, 2L)).thenReturn(true);
        when(userRepository.findByEmail("kid@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(30L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, 1L);

        assertEquals(1L, result.getUser().getTeamId());
        assertEquals(20L, result.getUser().getParentId());
    }

    @Test
    void createPlayer_asCoachOfAnotherTeam_isForbidden() {
        login(2L, "COACH");

        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));
        when(teamCoachRepository.existsByTeamIdAndUserId(9L, 2L)).thenReturn(false);

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, 9L));

        assertEquals(NOT_THIS_TEAM, error.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void softDeletePlayer_asCoachOfThatTeam_setsInactive() {
        login(2L, "COACH");

        AppUser player = activePlayerOnTeam(30L, 1L);
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(teamCoachRepository.existsByTeamIdAndUserId(1L, 2L)).thenReturn(true);
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.softDeletePlayer(30L);

        assertEquals(false, result.isActive());
    }

    @Test
    void softDeletePlayer_asCoachOfAnotherTeam_isForbidden() {
        login(2L, "COACH");

        AppUser player = activePlayerOnTeam(30L, 9L);
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(teamCoachRepository.existsByTeamIdAndUserId(9L, 2L)).thenReturn(false);

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.softDeletePlayer(30L));

        assertEquals(NOT_THIS_TEAM, error.getMessage());
        assertTrue(player.isActive());
    }

    @Test
    void updatePlayer_asCoach_cannotMovePlayerToAnotherTeam() {
        login(2L, "COACH");

        AppUser player = activePlayerOnTeam(30L, 1L);
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(teamCoachRepository.existsByTeamIdAndUserId(1L, 2L)).thenReturn(true);
        when(teamCoachRepository.existsByTeamIdAndUserId(9L, 2L)).thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> userService.updatePlayer(
                        30L, "Kid", "kid@fcvaxjo.se", null, 7, 9L, null, null, null, null));

        assertEquals(1L, player.getTeamId());
    }

    private void stubPlayerRoleAndParent() {
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole()));

        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");

        AppUser parent = new AppUser();
        parent.setId(20L);
        parent.setName("Parent One");
        parent.setRoleId(4L);

        when(userRepository.findById(20L)).thenReturn(Optional.of(parent));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(parentRole));
    }

    private void stubTeam(Long teamId) {
        Team team = new Team();
        team.setId(teamId);
        team.setName("P15");
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
    }

    private Role playerRole() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        return playerRole;
    }

    private AppUser activePlayerOnTeam(Long userId, Long teamId) {
        AppUser player = new AppUser();
        player.setId(userId);
        player.setRoleId(3L);
        player.setActive(true);
        player.setTeamId(teamId);
        return player;
    }

    @Test
    void readUser_adminMayReadAnyone() {
        userService.assertCallerMayReadUser(99L);
    }

    @Test
    void readUser_coachMayReadPlayerOnOwnTeam() {
        login(2L, "COACH");
        when(userRepository.findById(30L)).thenReturn(Optional.of(activePlayerOnTeam(30L, 10L)));
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 2L)).thenReturn(true);

        userService.assertCallerMayReadUser(30L);
    }

    @Test
    void readUser_coachMayNotReadPlayerOnAnotherTeam() {
        login(2L, "COACH");
        when(userRepository.findById(31L)).thenReturn(Optional.of(activePlayerOnTeam(31L, 11L)));
        when(teamCoachRepository.existsByTeamIdAndUserId(11L, 2L)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.assertCallerMayReadUser(31L));

        assertEquals("You can only read users on a team you train", ex.getMessage());
    }

    @Test
    void searchByPlayerNumber_coachGetsTheSameNotFoundWhenTheShirtIsNotOnTheirTeam() {
        login(2L, "COACH");

        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> userService.searchByPlayerNumber(22));

        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void readUser_chairmanMayReadAnyone() {
        login(4L, "CHAIRMAN");

        userService.assertCallerMayReadUser(99L);
    }

    @Test
    void readUser_playerMayReadSelf() {
        login(20L, "PLAYER");

        userService.assertCallerMayReadUser(20L);
    }

    @Test
    void readUser_playerMayNotReadSomeoneElse() {
        login(20L, "PLAYER");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.assertCallerMayReadUser(21L));

        assertEquals("You can only read your own user record", ex.getMessage());
    }

    @Test
    void readUser_parentMayReadSelfButNotTheirChild() {
        login(50L, "PARENT");

        userService.assertCallerMayReadUser(50L);

        assertThrows(AccessDeniedException.class,
                () -> userService.assertCallerMayReadUser(20L));
    }

    @Test
    void readUser_withoutLoginIsDenied() {
        SecurityContextHolder.clearContext();

        assertThrows(AccessDeniedException.class,
                () -> userService.assertCallerMayReadUser(20L));
    }

    @Test
    void changeRole_playerToCoach_asChairman_clearsParentShirtAndTeam() {
        login(4L, "CHAIRMAN");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.changeUserRole(30L, "COACH");

        assertEquals(2L, result.getRoleId());
        assertNull(result.getParentId());
        assertNull(result.getPlayerNumber());
        assertNull(result.getTeamId());
        verify(userRepository, never()).delete(any());
    }

    @Test
    void changeRole_playerToParent_asAdmin_keepsPlayerFields() {
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(roleRepository.findByName("PARENT")).thenReturn(Optional.of(role(4L, "PARENT")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.changeUserRole(30L, "PARENT");

        assertEquals(4L, result.getRoleId());
        assertEquals(20L, result.getParentId());
        assertEquals(7, result.getPlayerNumber());
        assertEquals(1L, result.getTeamId());
    }

    @Test
    void changeRole_toAdmin_asChairman_isForbidden() {
        login(4L, "CHAIRMAN");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(playerRole()));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(role(1L, "ADMIN")));

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(30L, "ADMIN"));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", error.getMessage());
        assertEquals(7, player.getPlayerNumber());
    }

    @Test
    void changeRole_asChairman_cannotChangeOwnRole() {
        login(4L, "CHAIRMAN");
        AppUser chairman = new AppUser();
        chairman.setId(4L);
        chairman.setRoleId(5L);
        when(userRepository.findById(4L)).thenReturn(Optional.of(chairman));
        when(roleRepository.findById(5L)).thenReturn(Optional.of(role(5L, "CHAIRMAN")));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(4L, "COACH"));

        assertEquals("You cannot change your own role", error.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changeRole_asCoach_cannotChangeOwnRole() {
        login(2L, "COACH");
        AppUser coach = new AppUser();
        coach.setId(2L);
        coach.setRoleId(2L);
        when(userRepository.findById(2L)).thenReturn(Optional.of(coach));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole()));

        AccessDeniedException error = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(2L, "PLAYER"));

        assertEquals("You cannot change your own role", error.getMessage());
    }

    @Test
    void changeRole_asAdmin_canChangeOwnRole() {
        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setRoleId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(roleRepository.findById(1L)).thenReturn(Optional.of(role(1L, "ADMIN")));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.changeUserRole(1L, "COACH");

        assertEquals(2L, result.getRoleId());
    }

    private Role role(Long id, String name) {
        Role named = new Role();
        named.setId(id);
        named.setName(name);
        return named;
    }

    private AppUser playerWithRosterFields() {
        AppUser player = new AppUser();
        player.setId(30L);
        player.setRoleId(3L);
        player.setParentId(20L);
        player.setPlayerNumber(7);
        player.setTeamId(1L);
        player.setActive(true);
        return player;
    }

}
