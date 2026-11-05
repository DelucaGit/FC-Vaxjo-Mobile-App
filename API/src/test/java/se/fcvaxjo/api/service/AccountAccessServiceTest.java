package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AccountAccessServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private AccountAccessService accountAccessService;

    @Test
    void tokenStillMatchesAccount_trueWhenUserIsActiveAndRoleMatches() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 2L)));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));

        assertTrue(accountAccessService.tokenStillMatchesAccount(7L, "COACH"));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenAccountIsInactive() {
        AppUser user = activeUser(7L, 2L);
        user.setActive(false);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH"));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenRoleInTokenIsOutOfDate() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 3L)));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH"));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenUserIsGone() {
        when(userRepository.findById(7L)).thenReturn(Optional.empty());

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH"));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenRoleRowIsGone() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 2L)));
        when(roleRepository.findById(2L)).thenReturn(Optional.empty());

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH"));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenTokenHasNoRole() {
        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, " "));
        assertFalse(accountAccessService.tokenStillMatchesAccount(null, "COACH"));
    }

    private AppUser activeUser(Long userId, Long roleId) {
        AppUser user = new AppUser();
        user.setId(userId);
        user.setRoleId(roleId);
        user.setActive(true);
        return user;
    }

    private Role role(Long roleId, String name) {
        Role role = new Role();
        role.setId(roleId);
        role.setName(name);
        return role;
    }
}
