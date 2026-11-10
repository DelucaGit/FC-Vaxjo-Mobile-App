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
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.ChangeRoleRequest;
import se.fcvaxjo.api.DTO.ChangeRoleResponse;
import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.CreateUserResponse;
import se.fcvaxjo.api.DTO.FetchUserResponse;
import se.fcvaxjo.api.DTO.PublicConsentRequest;
import se.fcvaxjo.api.DTO.PublicConsentResponse;
import se.fcvaxjo.api.DTO.SearchUsersRequest;
import se.fcvaxjo.api.DTO.UpdatePlayerRequest;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.service.CreatedUserResult;
import se.fcvaxjo.api.service.PublicConsentService;
import se.fcvaxjo.api.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final PublicConsentService publicConsentService;

    public UserController(UserService userService, PublicConsentService publicConsentService) {
        this.userService = userService;
        this.publicConsentService = publicConsentService;
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
     * The old search was a GET with the value in the URL.
     * That search is gone. 405 tells the client to use POST.
     * Without this method, {@code GET /api/users/{id}} would try to read
     * the word "search" as an id and answer 400.
     */
    @GetMapping("/search")
    public ResponseEntity<Void> oldSearchIsGone() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }

    /**
     * Find users by name, shirt number, or phone.
     * The value is in the JSON body, not the URL, so an access log does not
     * store a name, a shirt number, or a phone (F1, ADR 0004).
     * Exactly one field must be set. Name returns a list. Shirt and phone
     * return one user. Players and parents are refused: a hit contains
     * other people's contact details.
     * GET on this URL answers 405 and does not search.
     */
    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<Object> search(@RequestBody SearchUsersRequest request) {
        boolean hasName = hasText(request == null ? null : request.getName());
        boolean hasShirt = request != null && request.getPlayerNumber() != null;
        boolean hasPhone = hasText(request == null ? null : request.getPhone());
        int filled = (hasName ? 1 : 0) + (hasShirt ? 1 : 0) + (hasPhone ? 1 : 0);
        if (filled != 1) {
            throw new BadRequestException("Send exactly one of name, playerNumber or phone");
        }
        if (hasName) {
            return ResponseEntity.ok(toList(userService.searchByName(request.getName())));
        }
        if (hasShirt) {
            return ResponseEntity.ok(toFetchResponse(userService.searchByPlayerNumber(request.getPlayerNumber())));
        }
        return ResponseEntity.ok(toFetchResponse(userService.searchByMobilePhoneNumber(request.getPhone())));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<FetchUserResponse> toList(List<AppUser> databaseUsers) {
        List<FetchUserResponse> responseUsers = new ArrayList<>();
        for (AppUser databaseUser : databaseUsers) {
            responseUsers.add(toFetchResponse(databaseUser));
        }
        return responseUsers;
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

    /**
     * The linked parent turns public name and shirt number on or off.
     * The player cannot do this. Staff cannot do this.
     * A missing id and someone else's child use the same 403.
     */
    @PutMapping("/{id}/public-consent")
    @PreAuthorize("hasRole('PARENT')")
    public PublicConsentResponse setPublicConsent(
            @PathVariable Long id,
            @RequestBody PublicConsentRequest request) {
        AppUser player = publicConsentService.setConsent(id, request.getPublicConsent());
        return new PublicConsentResponse(
                player.getId(),
                player.getPublicConsentAt() != null,
                player.getPublicConsentAt());
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
                userService.parentNameForCaller(user.getParentId()),
                userService.parentEmailForCaller(user.getParentId()),
                userService.parentPhoneForCaller(user.getParentId()),
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
                userService.parentNameForCaller(user.getParentId()),
                userService.parentEmailForCaller(user.getParentId()),
                userService.parentPhoneForCaller(user.getParentId()),
                user.getTeamId(),
                userService.getTeamName(user.getTeamId()),
                user.isActive(),
                created.getTemporaryPassword(),
                created.getParentTemporaryPassword());
    }
}
