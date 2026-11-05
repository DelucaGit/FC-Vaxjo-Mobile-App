package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setAdminAuth() {
        var auth = new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
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

        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");

        AppUser parent = new AppUser();
        parent.setId(20L);
        parent.setRoleId(4L);

        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));
        when(userRepository.findById(20L)).thenReturn(Optional.of(parent));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(parentRole));

        assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null, null));
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
        var coachAuth = new UsernamePasswordAuthenticationToken(
                2L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_COACH")));
        SecurityContextHolder.getContext().setAuthentication(coachAuth);

        assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Other Coach", "coach2@fcvaxjo.se", "COACH", null, null, null, null, null));
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
    void createCoach_asChairman_savesCoachWithoutTeamOrParent() {
        logInAs("CHAIRMAN");
        Role coachRole = role(2L, "COACH");
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(coachRole));
        when(userRepository.findByEmail("new.coach@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(40L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "New Coach", "new.coach@fcvaxjo.se", "COACH", 7, null, 20L, null, 1L);

        assertEquals(2L, result.getUser().getRoleId());
        // parentId and teamId are only stored for a PLAYER. A shirt number, if sent, is still stored.
        assertEquals(null, result.getUser().getParentId());
        assertEquals(null, result.getUser().getTeamId());
        assertEquals(7, result.getUser().getPlayerNumber());
        assertNotNull(result.getTemporaryPassword());
    }

    @Test
    void createAdmin_asChairman_isForbidden() {
        logInAs("CHAIRMAN");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Boss", "boss@fcvaxjo.se", "ADMIN", null, null, null, null, null));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", ex.getMessage());
    }

    @Test
    void createChairman_asChairman_isForbidden() {
        logInAs("CHAIRMAN");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Other Chair", "chair2@fcvaxjo.se", "CHAIRMAN", null, null, null, null, null));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", ex.getMessage());
    }

    @Test
    void createPlayer_asChairman_isForbidden() {
        logInAs("CHAIRMAN");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, null, null, 1L));

        assertEquals("CHAIRMAN may only create a COACH", ex.getMessage());
    }

    @Test
    void createAdmin_asAdmin_stillAllowed() {
        Role adminRole = role(1L, "ADMIN");
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("boss@fcvaxjo.se")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-temp");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(41L);
            return saved;
        });

        CreatedUserResult result = userService.createUser(
                "Boss", "boss@fcvaxjo.se", "ADMIN", null, null, null, null, null);

        assertEquals(1L, result.getUser().getRoleId());
    }

    @Test
    void changeRole_playerToCoach_asChairman_clearsParentShirtAndTeam() {
        logInAs("CHAIRMAN");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.changeUserRole(30L, "COACH");

        assertEquals(2L, result.getRoleId());
        assertEquals(null, result.getParentId());
        assertEquals(null, result.getPlayerNumber());
        assertEquals(null, result.getTeamId());
        verify(userRepository, never()).delete(any());
    }

    @Test
    void changeRole_playerToCoach_asAdmin_clearsParentShirtAndTeam() {
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = userService.changeUserRole(30L, "COACH");

        assertEquals(2L, result.getRoleId());
        assertEquals(null, result.getParentId());
        assertEquals(null, result.getPlayerNumber());
        assertEquals(null, result.getTeamId());
    }

    @Test
    void changeRole_playerToParent_asAdmin_keepsPlayerFields() {
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
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
        logInAs("CHAIRMAN");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(role(1L, "ADMIN")));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(30L, "ADMIN"));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", ex.getMessage());
        assertEquals(7, player.getPlayerNumber());
    }

    @Test
    void changeRole_toChairman_asChairman_isForbidden() {
        logInAs("CHAIRMAN");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
        when(roleRepository.findByName("CHAIRMAN")).thenReturn(Optional.of(role(5L, "CHAIRMAN")));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(30L, "CHAIRMAN"));

        assertEquals("CHAIRMAN cannot assign the role ADMIN or CHAIRMAN", ex.getMessage());
    }

    @Test
    void changeRole_coachToPlayer_asChairman_isForbidden() {
        logInAs("CHAIRMAN");
        AppUser coach = new AppUser();
        coach.setId(30L);
        coach.setRoleId(2L);
        when(userRepository.findById(30L)).thenReturn(Optional.of(coach));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(role(3L, "PLAYER")));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> userService.changeUserRole(30L, "PLAYER"));

        assertEquals("CHAIRMAN may only change a PLAYER to COACH", ex.getMessage());
    }

    @Test
    void changeRole_asCoach_isForbidden() {
        logInAs("COACH");
        AppUser player = playerWithRosterFields();
        when(userRepository.findById(30L)).thenReturn(Optional.of(player));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));
        when(roleRepository.findByName("COACH")).thenReturn(Optional.of(role(2L, "COACH")));

        assertThrows(AccessDeniedException.class, () -> userService.changeUserRole(30L, "COACH"));
    }

    private void logInAs(String roleName) {
        var auth = new UsernamePasswordAuthenticationToken(
                2L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Role role(Long id, String name) {
        Role role = new Role();
        role.setId(id);
        role.setName(name);
        return role;
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
