package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.Instant;
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

    /** Whole-second iat. Password checks below move around this instant. */
    private static final Instant ISSUED_AT = Instant.parse("2026-11-05T12:00:00Z");

    @Test
    void tokenStillMatchesAccount_trueWhenUserIsActiveAndRoleMatches() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 2L)));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));

        assertTrue(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenAccountIsInactive() {
        AppUser user = activeUser(7L, 2L);
        user.setActive(false);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_trueWhenRoleIsChairman() {
        when(userRepository.findById(4L)).thenReturn(Optional.of(activeUser(4L, 3L)));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "CHAIRMAN")));

        assertTrue(accountAccessService.tokenStillMatchesAccount(4L, "CHAIRMAN", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenChairmanTokenNoLongerMatches() {
        when(userRepository.findById(4L)).thenReturn(Optional.of(activeUser(4L, 2L)));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));

        assertFalse(accountAccessService.tokenStillMatchesAccount(4L, "CHAIRMAN", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenRoleInTokenIsOutOfDate() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 3L)));
        when(roleRepository.findById(3L)).thenReturn(Optional.of(role(3L, "PLAYER")));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenUserIsGone() {
        when(userRepository.findById(7L)).thenReturn(Optional.empty());

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenRoleRowIsGone() {
        when(userRepository.findById(7L)).thenReturn(Optional.of(activeUser(7L, 2L)));
        when(roleRepository.findById(2L)).thenReturn(Optional.empty());

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenTokenHasNoRole() {
        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, " ", ISSUED_AT));
        assertFalse(accountAccessService.tokenStillMatchesAccount(null, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenPasswordChangedInALaterSecond() {
        AppUser user = activeUser(7L, 2L);
        user.setPasswordChangedAt(ISSUED_AT.plusSeconds(1));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_trueWhenPasswordChangedInTheSameSecond() {
        // iat cannot see milliseconds. A change inside the token's own second
        // must not reject the token the user just received.
        AppUser user = activeUser(7L, 2L);
        user.setPasswordChangedAt(ISSUED_AT.plusMillis(800));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));

        assertTrue(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_trueWhenPasswordChangedBeforeTheToken() {
        AppUser user = activeUser(7L, 2L);
        user.setPasswordChangedAt(ISSUED_AT.minusSeconds(5));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(role(2L, "COACH")));

        assertTrue(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT));
    }

    @Test
    void tokenStillMatchesAccount_falseWhenIssuedAtIsMissingAfterPasswordChange() {
        AppUser user = activeUser(7L, 2L);
        user.setPasswordChangedAt(ISSUED_AT);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertFalse(accountAccessService.tokenStillMatchesAccount(7L, "COACH", null));
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
