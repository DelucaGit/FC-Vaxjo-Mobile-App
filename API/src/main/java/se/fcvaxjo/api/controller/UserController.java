package se.fcvaxjo.api.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.service.UserService;
import java.util.List;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<AppUser> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping
    public AppUser createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(
                request.getName(),
                request.getEmail(),
                request.getRoleName());
    }
}
