package se.fcvaxjo.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
            responseUsers.add(toFetchResponse(databaseUser));
        }

        return responseUsers;
    }

    /**
     * Find users by part of the name. Same URL as number search;
     * Spring picks this method because the query string contains {@code name}.
     *
     * @param name text to look for ({@code Er} finds Erik)
     * @return matching users, may be empty
     */
    @GetMapping(value = "/search", params = "name")
    public List<FetchUserResponse> searchByName(@RequestParam String name) {
        List<AppUser> databaseUsers = userService.searchByName(name);
        List<FetchUserResponse> responseUsers = new ArrayList<>();

        for (AppUser databaseUser : databaseUsers) {
            responseUsers.add(toFetchResponse(databaseUser));
        }

        return responseUsers;
    }

    /**
     * Find one user by shirt number. Same URL as name search;
     * Spring picks this method because the query string contains {@code number}.
     * Returns one user because shirt numbers are unique.
     *
     * @param number the shirt number (exact match)
     */
    @GetMapping(value = "/search", params = "number")
    public FetchUserResponse searchByPlayerNumber(@RequestParam Integer number) {
        return toFetchResponse(userService.searchByPlayerNumber(number));
    }

    /**
     * Find one user by mobile phone. Same URL as name/number search;
     * Spring picks this method because the query string contains {@code phone}.
     * Returns one user because phone numbers are unique when set.
     *
     * @param phone the mobile number (exact match)
     */
    @GetMapping(value = "/search", params = "phone")
    public FetchUserResponse searchByMobilePhoneNumber(@RequestParam String phone) {
        return toFetchResponse(userService.searchByMobilePhoneNumber(phone));
    }

    @GetMapping("/{id}")
    public FetchUserResponse getUserById(@PathVariable Long id) {
        return toFetchResponse(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<CreateUserResponse> createUser(@RequestBody CreateUserRequest request) {

        AppUser createdUser = userService.createUser(
                request.getName(),
                request.getEmail(),
                request.getRoleName(),
                request.getPlayerNumber(),
                request.getMobilePhoneNumber(),
                request.getParentId(),
                request.getNewParent(),
                request.getTeamId());

        return ResponseEntity.status(HttpStatus.CREATED).body(toCreateResponse(createdUser));
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

    private FetchUserResponse toFetchResponse(AppUser user) {
        return new FetchUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                userService.getRoleName(user.getRoleId()),
                user.getPlayerNumber(),
                user.getMobilePhoneNumber(),
                user.getParentId(),
                userService.getParentName(user.getParentId()),
                user.getTeamId(),
                userService.getTeamName(user.getTeamId()));
    }

    private CreateUserResponse toCreateResponse(AppUser user) {
        return new CreateUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                userService.getRoleName(user.getRoleId()),
                user.getPlayerNumber(),
                user.getMobilePhoneNumber(),
                user.getParentId(),
                userService.getParentName(user.getParentId()),
                user.getTeamId(),
                userService.getTeamName(user.getTeamId()));
    }
}
