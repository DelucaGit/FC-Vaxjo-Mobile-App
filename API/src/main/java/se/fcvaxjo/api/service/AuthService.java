package se.fcvaxjo.api.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.DTO.LoginResponse;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.exception.UnauthorizedException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

@Service
public class AuthService {

    /**
     * Same text for a wrong password, an unknown email, an inactive account,
     * and an account that has no password yet. A different text would tell
     * the caller that the email exists.
     */
    public static final String INVALID_LOGIN_MESSAGE = "Invalid email or password";

    /**
     * Real BCrypt hash used only when there is no stored hash to check.
     * Built once, at the same cost as a normal password check.
     * The plaintext is not a password for any account. The match result is ignored.
     */
    static final String TIMING_BCRYPT_HASH = new BCryptPasswordEncoder().encode("timing-placeholder");

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new BadRequestException("Email and password are required");
        }

        AppUser user = userRepository.findByEmail(email.trim()).orElse(null);
        if (!passwordMatchesActiveAccount(user, password)) {
            throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
        }

        String roleName = userService.getRoleName(user.getRoleId());
        String token = jwtService.createToken(user.getId(), user.getEmail(), roleName);
        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                roleName,
                user.isMustChangePassword());
    }

    @Transactional
    public LoginResponse changePassword(String currentPassword, String newPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new BadRequestException("Current password is required");
        }
        if (newPassword == null || newPassword.isBlank() || newPassword.length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters");
        }

        Long userId = currentUserId();
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadRequestException("Current password is wrong");
        }

        PasswordChange.storeHash(user, passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        String roleName = userService.getRoleName(user.getRoleId());
        String token = jwtService.createToken(user.getId(), user.getEmail(), roleName);
        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                roleName,
                false);
    }

    /**
     * Issues a new JWT for the currently authenticated user (sliding 120-minute window).
     * Requires a still-valid Bearer token.
     */
    public LoginResponse refresh() {
        Long userId = currentUserId();
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // The JWT filter already stops inactive accounts over HTTP.
        // This check stays so a direct call still refuses the account.
        // 400 "This account is inactive" would say the account exists (F11).
        // 401 "Login required" is the same answer the filter already sends,
        // and the answer the role matrix now asks for.
        if (!user.isActive()) {
            throw new UnauthorizedException("Login required");
        }

        String roleName = userService.getRoleName(user.getRoleId());
        String token = jwtService.createToken(user.getId(), user.getEmail(), roleName);
        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                roleName,
                user.isMustChangePassword());
    }

    /**
     * False for a wrong password, a missing account, an inactive account,
     * and a row with no hash. The caller always sends {@link #INVALID_LOGIN_MESSAGE}.
     *
     * BCrypt is slow on purpose. Skipping it when the email is missing would
     * return faster and show that the account does not exist. We still run
     * one compare in that case, against {@link #TIMING_BCRYPT_HASH}, and we
     * ignore the result. An inactive account uses its real hash for the same
     * reason, then we reject it even if the password was right.
     */
    private boolean passwordMatchesActiveAccount(AppUser user, String password) {
        String hash = hashToCheck(user);
        boolean passwordMatches = passwordEncoder.matches(password, hash);
        if (user == null || !user.isActive() || !hasStoredHash(user)) {
            return false;
        }
        return passwordMatches;
    }

    private String hashToCheck(AppUser user) {
        if (!hasStoredHash(user)) {
            return TIMING_BCRYPT_HASH;
        }
        return user.getPasswordHash();
    }

    private boolean hasStoredHash(AppUser user) {
        return user != null
                && user.getPasswordHash() != null
                && !user.getPasswordHash().isBlank();
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AccessDeniedException("Not logged in");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Long id) {
            return id;
        }
        throw new AccessDeniedException("Not logged in");
    }
}
