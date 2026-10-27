package se.fcvaxjo.api.controller;

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
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request.getEmail(), request.getPassword());
    }

    /** Requires a valid JWT. Clears mustChangePassword after a successful change. */
    @PostMapping("/change-password")
    public LoginResponse changePassword(@RequestBody ChangePasswordRequest request) {
        return authService.changePassword(request.getCurrentPassword(), request.getNewPassword());
    }
}
