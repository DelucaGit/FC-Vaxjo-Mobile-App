package se.fcvaxjo.api.services;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import se.fcvaxjo.api.dto.AuthResponse;
import se.fcvaxjo.api.dto.CreateUserRequest;
import se.fcvaxjo.api.dto.LoginRequest;
import se.fcvaxjo.api.dto.RegisterRequest;
import se.fcvaxjo.api.dto.UserResponse;
import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.User;
import se.fcvaxjo.api.repositories.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Login and parent self-registration.
 */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserService userService;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            UserService userService,
            JwtService jwtService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.userService = userService;
        this.jwtService = jwtService;
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (AuthenticationException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        String token = jwtService.createToken(user);
        return AuthResponse.bearer(token, UserResponse.from(user));
    }

    @Transactional
    public AuthResponse registerParent(RegisterRequest request) {
        CreateUserRequest createRequest = new CreateUserRequest(
                request.firstName(),
                request.lastName(),
                request.email(),
                request.password(),
                request.phone(),
                Role.PARENT
        );

        UserResponse created = userService.create(createRequest);
        User user = userService.getUserOrThrow(created.id());
        String token = jwtService.createToken(user);
        return AuthResponse.bearer(token, created);
    }
}
