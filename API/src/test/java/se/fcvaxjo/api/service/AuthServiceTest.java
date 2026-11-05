package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import se.fcvaxjo.api.exception.BadRequestException;
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
        when(passwordEncoder.matches("TempAdmin1!", "hashed")).thenReturn(true);
        when(userService.getRoleName(1L)).thenReturn("ADMIN");
        when(jwtService.createToken(5L, "admin@fcvaxjo.se", "ADMIN")).thenReturn("jwt-token");

        LoginResponse response = authService.login("admin@fcvaxjo.se", "TempAdmin1!");

        assertEquals("jwt-token", response.getToken());
        assertEquals(5L, response.getUserId());
        assertEquals("ADMIN", response.getRoleName());
        assertTrue(response.isMustChangePassword());
    }

    @Test
    void login_failsWhenPasswordWrong() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setEmail("admin@fcvaxjo.se");
        user.setActive(true);
        user.setPasswordHash("hashed");

        when(userRepository.findByEmail("admin@fcvaxjo.se")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad", "hashed")).thenReturn(false);

        assertThrows(BadRequestException.class,
                () -> authService.login("admin@fcvaxjo.se", "bad"));
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
        when(passwordEncoder.matches("TempAdmin1!", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("NewSecure1!")).thenReturn("new-hash");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userService.getRoleName(1L)).thenReturn("ADMIN");
        when(jwtService.createToken(eq(5L), anyString(), eq("ADMIN"))).thenReturn("new-jwt");

        LoginResponse response = authService.changePassword("TempAdmin1!", "NewSecure1!");

        assertFalse(response.isMustChangePassword());
        assertFalse(user.isMustChangePassword());
        assertEquals("new-hash", user.getPasswordHash());
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
}
