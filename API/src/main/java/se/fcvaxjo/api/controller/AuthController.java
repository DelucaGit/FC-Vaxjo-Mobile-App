package se.fcvaxjo.api.controller;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.ChangePasswordRequest;
import se.fcvaxjo.api.DTO.LoginRequest;
import se.fcvaxjo.api.DTO.LoginResponse;
import se.fcvaxjo.api.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest http) {
        // getRemoteAddr() is the address that connected to us. X-Forwarded-For is ignored on purpose,
        // because any caller can fake it. Follow-up: behind Railway's proxy every request may share
        // the proxy's IP, so trusted forwarded headers must be set up when we move there.
        return authService.login(request.getEmail(), request.getPassword(), http.getRemoteAddr());
    }

    /** Requires a valid JWT. Clears mustChangePassword after a successful change. */
    @PostMapping("/change-password")
    public LoginResponse changePassword(@RequestBody ChangePasswordRequest request) {
        return authService.changePassword(request.getCurrentPassword(), request.getNewPassword());
    }

    /** Requires a still-valid JWT. Returns a new token (another 120 minutes). */
    @PostMapping("/refresh")
    public LoginResponse refresh() {
        return authService.refresh();
    }
}
