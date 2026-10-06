package se.fcvaxjo.api.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.ChangeRoleRequest;
import se.fcvaxjo.api.DTO.CreateUserResponse;
import se.fcvaxjo.api.service.UserService;
import java.util.List;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import se.fcvaxjo.api.DTO.FetchUserResponse;
import se.fcvaxjo.api.DTO.ChangeRoleResponse;
import java.util.ArrayList;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/users")
// TODO: Add @PreAuthorize to all methods
// TODO: Return correct HTTP status codes
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<FetchUserResponse> getAllUsers() {
        List<AppUser> databaseUsers = userService.getAllUsers();
        List<FetchUserResponse> responseUsers = new ArrayList<>();

        for (AppUser databaseUser : databaseUsers) {
            String roleName = userService.getRoleName(databaseUser.getRoleId());
            responseUsers.add(new FetchUserResponse(
                    databaseUser.getId(),
                    databaseUser.getName(),
                    databaseUser.getEmail(),
                    roleName,
                    databaseUser.getPlayerNumber()));
        }

        return responseUsers;
    }

    @GetMapping(value = "/search", params = "name")
    public List<FetchUserResponse> searchByName(@RequestParam String name) {
        List<AppUser> databaseUsers = userService.searchByName(name);
        List<FetchUserResponse> responseUsers = new ArrayList<>();

        for (AppUser databaseUser : databaseUsers) {
            String roleName = userService.getRoleName(databaseUser.getRoleId());
            responseUsers.add(new FetchUserResponse(
                    databaseUser.getId(),
                    databaseUser.getName(),
                    databaseUser.getEmail(),
                    roleName,
                    databaseUser.getPlayerNumber()));
        }

        return responseUsers;
    }

    @GetMapping(value = "/search", params = "number")
    public FetchUserResponse searchByPlayerNumber(@RequestParam Integer number) {
        AppUser foundUser = userService.searchByPlayerNumber(number);
        String roleName = userService.getRoleName(foundUser.getRoleId());
        return new FetchUserResponse(
                foundUser.getId(),
                foundUser.getName(),
                foundUser.getEmail(),
                roleName,
                foundUser.getPlayerNumber());
    }

    @GetMapping("/{id}")
    public FetchUserResponse getUserById(@PathVariable Long id) {
        AppUser fetchedUser = userService.getUserById(id);
        String roleName = userService.getRoleName(fetchedUser.getRoleId());
        return new FetchUserResponse(
                fetchedUser.getId(),
                fetchedUser.getName(),
                fetchedUser.getEmail(),
                roleName,
                fetchedUser.getPlayerNumber());
    }

    @PostMapping
    public CreateUserResponse createUser(@RequestBody CreateUserRequest request) {

        AppUser createdUser = userService.createUser(
                request.getName(),
                request.getEmail(),
                request.getRoleName(),
                request.getPlayerNumber());

        String roleName = userService.getRoleName(createdUser.getRoleId());

        return new CreateUserResponse(
                createdUser.getId(),
                createdUser.getName(),
                createdUser.getEmail(),
                roleName,
                createdUser.getPlayerNumber());
    }

    @PutMapping("/{id}/role")
    public ChangeRoleResponse updateUserRole(
            @PathVariable Long id,
            @RequestBody ChangeRoleRequest request) {

        AppUser updatedUser = userService.changeUserRole(
                id,
                request.getRoleName());

        String roleName = userService.getRoleName(updatedUser.getRoleId());

        return new ChangeRoleResponse(
                updatedUser.getId(),
                roleName);

    }
}
