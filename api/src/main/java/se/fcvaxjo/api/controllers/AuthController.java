package se.fcvaxjo.api.controllers;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.dto.AuthResponse;
import se.fcvaxjo.api.dto.LoginRequest;
import se.fcvaxjo.api.dto.RegisterRequest;
import se.fcvaxjo.api.services.AuthService;

/**
 * Public auth endpoints (no JWT needed).
 *
 * POST /api/auth/login    → get a JWT
 * POST /api/auth/register → parent signs up and gets a JWT
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.registerParent(request);
    }
}
