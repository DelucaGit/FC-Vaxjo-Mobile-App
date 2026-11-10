package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import se.fcvaxjo.api.DTO.LoginResponse;
import se.fcvaxjo.api.exception.UnauthorizedException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginAttemptLimiter loginLimiter;

    @InjectMocks
    private AuthService authService;

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void login_returnsTokenWhenPasswordMatches() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail("admin@fcvaxjo.se");
        user.setRoleId(1L);
        user.setActive(true);
        user.setPasswordHash("hashed");
        user.setMustChangePassword(true);

        when(userRepository.findByEmail("admin@fcvaxjo.se")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("test-current-password", "hashed")).thenReturn(true);
        when(userService.getRoleName(1L)).thenReturn("ADMIN");
        when(jwtService.createToken(5L, "admin@fcvaxjo.se", "ADMIN")).thenReturn("jwt-token");

        LoginResponse response = authService.login("admin@fcvaxjo.se", "test-current-password", "198.51.100.1");

        assertEquals("jwt-token", response.getToken());
        assertEquals(5L, response.getUserId());
        assertEquals("ADMIN", response.getRoleName());
        assertTrue(response.isMustChangePassword());
    }

    @Test
    void login_failsWhenPasswordWrong() {
        AppUser user = activeUser("admin@fcvaxjo.se", "hashed");
        when(userRepository.findByEmail("admin@fcvaxjo.se")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad", "hashed")).thenReturn(false);

        UnauthorizedException error = assertThrows(UnauthorizedException.class,
                () -> authService.login("admin@fcvaxjo.se", "bad", "198.51.100.1"));

        assertEquals(AuthService.INVALID_LOGIN_MESSAGE, error.getMessage());
    }

    @Test
    void login_unknownEmail_usesTheSameMessageAndStillRunsBcrypt() {
        when(userRepository.findByEmail("missing@example.test")).thenReturn(Optional.empty());

        UnauthorizedException error = assertThrows(UnauthorizedException.class,
                () -> authService.login("missing@example.test", "bad", "198.51.100.1"));

        assertEquals(AuthService.INVALID_LOGIN_MESSAGE, error.getMessage());
        // No stored hash exists. The dummy compare keeps this path from returning faster.
        verify(passwordEncoder).matches("bad", AuthService.TIMING_BCRYPT_HASH);
    }

    @Test
    void login_inactiveAccount_usesTheSameMessageEvenWhenPasswordMatches() {
        AppUser user = activeUser("off@example.test", "hashed");
        user.setActive(false);
        when(userRepository.findByEmail("off@example.test")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("right", "hashed")).thenReturn(true);

        UnauthorizedException error = assertThrows(UnauthorizedException.class,
                () -> authService.login("off@example.test", "right", "198.51.100.1"));

        assertEquals(AuthService.INVALID_LOGIN_MESSAGE, error.getMessage());
        verify(passwordEncoder).matches("right", "hashed");
    }

    @Test
    void login_accountWithNoPassword_usesTheSameMessage() {
        AppUser user = activeUser("new@example.test", null);
        when(userRepository.findByEmail("new@example.test")).thenReturn(Optional.of(user));

        UnauthorizedException error = assertThrows(UnauthorizedException.class,
                () -> authService.login("new@example.test", "anything", "198.51.100.1"));

        assertEquals(AuthService.INVALID_LOGIN_MESSAGE, error.getMessage());
        verify(passwordEncoder).matches("anything", AuthService.TIMING_BCRYPT_HASH);
    }

    @Test
    void changePassword_clearsMustChangeFlag() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail("admin@fcvaxjo.se");
        user.setRoleId(1L);
        user.setPasswordHash("old-hash");
        user.setMustChangePassword(true);

        var auth = new UsernamePasswordAuthenticationToken(
                5L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("test-current-password", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("test-new-password")).thenReturn("new-hash");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userService.getRoleName(1L)).thenReturn("ADMIN");
        when(jwtService.createToken(eq(5L), anyString(), eq("ADMIN"))).thenReturn("new-jwt");

        LoginResponse response = authService.changePassword("test-current-password", "test-new-password");

        assertFalse(response.isMustChangePassword());
        assertFalse(user.isMustChangePassword());
        assertEquals("new-hash", user.getPasswordHash());
        assertNotNull(user.getPasswordChangedAt());
        assertEquals("new-jwt", response.getToken());
        verify(userRepository).save(user);
    }

    @Test
    void refresh_returnsNewTokenForLoggedInUser() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail("admin@fcvaxjo.se");
        user.setRoleId(1L);
        user.setActive(true);
        user.setMustChangePassword(false);

        var auth = new UsernamePasswordAuthenticationToken(
                5L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(userService.getRoleName(1L)).thenReturn("ADMIN");
        when(jwtService.createToken(5L, "admin@fcvaxjo.se", "ADMIN")).thenReturn("refreshed-jwt");

        LoginResponse response = authService.refresh();

        assertEquals("refreshed-jwt", response.getToken());
        assertEquals(5L, response.getUserId());
        assertEquals("ADMIN", response.getRoleName());
        assertFalse(response.isMustChangePassword());
    }

    @Test
    void refresh_inactiveAccount_doesNotSayTheAccountIsInactive() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail("off@example.test");
        user.setRoleId(1L);
        user.setActive(false);

        var auth = new UsernamePasswordAuthenticationToken(
                5L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_PLAYER")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));

        UnauthorizedException error = assertThrows(UnauthorizedException.class, () -> authService.refresh());

        assertEquals("Login required", error.getMessage());
    }

    private AppUser activeUser(String email, String passwordHash) {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail(email);
        user.setActive(true);
        user.setPasswordHash(passwordHash);
        return user;
    }
}
