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
        // Never read X-Real-IP or X-Forwarded-For here: any caller can fake them. In prod, Tomcat's
        // RemoteIpValve puts X-Real-IP into getRemoteAddr(), but only when the request came through
        // a trusted internal proxy (application-prod.properties, ADR 0008).
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
