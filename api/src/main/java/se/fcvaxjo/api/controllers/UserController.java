package se.fcvaxjo.api.controllers;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.dto.CreateUserRequest;
import se.fcvaxjo.api.dto.UserResponse;
import se.fcvaxjo.api.services.UserService;

/**
 * HTTP endpoints for users.
 * Creating coach/admin/player accounts is admin-only.
 * Parents should use POST /api/auth/register instead.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<UserResponse> list() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public UserResponse getById(@PathVariable Long id) {
        return userService.findById(id);
    }
}
