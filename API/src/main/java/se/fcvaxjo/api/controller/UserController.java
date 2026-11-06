package se.fcvaxjo.api.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.ChangeRoleRequest;
import se.fcvaxjo.api.DTO.ChangeRoleResponse;
import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.CreateUserResponse;
import se.fcvaxjo.api.DTO.FetchUserResponse;
import se.fcvaxjo.api.DTO.UpdatePlayerRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.service.CreatedUserResult;
import se.fcvaxjo.api.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * The list includes every member's email and phone.
     * Same rule as {@code ClubRole.canReadEveryTeam()}: ADMIN and CHAIRMAN.
     * A coach does not get the whole club. They open one team they train.
     * Players and parents must not download other people's contact details.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN')")
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
     * Players and parents are refused: a name search returns other people's contact details.
     * ADMIN and CHAIRMAN search the whole club. A coach only gets people on teams they train.
     *
     * @param name text to look for ({@code Er} finds Erik)
     * @return matching users, may be empty
     */
    @GetMapping(value = "/search", params = "name")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
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
     * Players and parents are refused, same as name search: the hit contains contact details.
     * A coach only finds a shirt number on a team they train. Another team is the same 404 as a missing number.
     *
     * @param number the shirt number (exact match)
     */
    @GetMapping(value = "/search", params = "number")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public FetchUserResponse searchByPlayerNumber(@RequestParam Integer number) {
        return toFetchResponse(userService.searchByPlayerNumber(number));
    }

    /**
     * Find one user by mobile phone. Same URL as name/number search;
     * Spring picks this method because the query string contains {@code phone}.
     * Returns one user because phone numbers are unique when set.
     * Players and parents are refused, same as name search: the hit contains contact details.
     * A coach only finds a phone number on a team they train. Another team is the same 404 as a missing number.
     *
     * @param phone the mobile number (exact match)
     */
    @GetMapping(value = "/search", params = "phone")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public FetchUserResponse searchByMobilePhoneNumber(@RequestParam String phone) {
        return toFetchResponse(userService.searchByMobilePhoneNumber(phone));
    }

    /**
     * ADMIN and CHAIRMAN may read any active user. A coach may read an active person
     * on a team they train, and their own id. A player or parent may read only their
     * own id, because the home screen loads their name from this URL.
     * ADMIN and CHAIRMAN get 404 "User not found" for a missing id and for an
     * inactive account (ADR 0004, S1-13). PLAYER, PARENT and COACH get 403 for
     * both, the same answer as a missing id (F3). Who may call stays in
     * {@code readActiveUser}.
     */
    @GetMapping("/{id}")
    public FetchUserResponse getUserById(@PathVariable Long id) {
        return toFetchResponse(userService.readActiveUser(id));
    }

    /**
     * Chairman may create a player, a parent, or a coach.
     * The service still refuses ADMIN and CHAIRMAN as the new role.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<CreateUserResponse> createUser(@RequestBody CreateUserRequest request) {
        CreatedUserResult created = userService.createUser(
                request.getName(),
                request.getEmail(),
                request.getRoleName(),
                request.getPlayerNumber(),
                request.getMobilePhoneNumber(),
                request.getParentId(),
                request.getNewParent(),
                request.getTeamId());

        return ResponseEntity.status(HttpStatus.CREATED).body(toCreateResponse(created));
    }

    // CHAIRMAN may turn a player into a coach. The service still blocks ADMIN and CHAIRMAN as the new role.
    @PutMapping("/{id}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN')")
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

    @PutMapping("/{id}/player")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public FetchUserResponse updatePlayer(
            @PathVariable Long id,
            @RequestBody UpdatePlayerRequest request) {
        AppUser updated = userService.updatePlayer(
                id,
                request.getName(),
                request.getEmail(),
                request.getMobilePhoneNumber(),
                request.getPlayerNumber(),
                request.getTeamId(),
                request.getParentId(),
                request.getParentName(),
                request.getParentEmail(),
                request.getParentMobilePhoneNumber());
        return toFetchResponse(updated);
    }

    /** Soft-delete: sets active=false. Player disappears from team lists. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<Void> softDeletePlayer(@PathVariable Long id) {
        userService.softDeletePlayer(id);
        return ResponseEntity.noContent().build();
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
                userService.getParentEmail(user.getParentId()),
                userService.getParentMobilePhoneNumber(user.getParentId()),
                user.getTeamId(),
                userService.getTeamName(user.getTeamId()),
                user.isActive());
    }

    private CreateUserResponse toCreateResponse(CreatedUserResult created) {
        AppUser user = created.getUser();
        return new CreateUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                userService.getRoleName(user.getRoleId()),
                user.getPlayerNumber(),
                user.getMobilePhoneNumber(),
                user.getParentId(),
                userService.getParentName(user.getParentId()),
                userService.getParentEmail(user.getParentId()),
                userService.getParentMobilePhoneNumber(user.getParentId()),
                user.getTeamId(),
                userService.getTeamName(user.getTeamId()),
                user.isActive(),
                created.getTemporaryPassword(),
                created.getParentTemporaryPassword());
    }
}
