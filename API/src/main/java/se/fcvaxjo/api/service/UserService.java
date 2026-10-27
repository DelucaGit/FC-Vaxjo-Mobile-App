package se.fcvaxjo.api.service;

import java.security.SecureRandom;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.DTO.NewParentRequest;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@Service
public class UserService {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            TeamRepository teamRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates a user with a generated temporary password.
     * ADMIN may create any role. COACH may only create PLAYER (and linked new parent).
     */
    @Transactional
    public CreatedUserResult createUser(String name, String email, String roleName, Integer playerNumber,
            String mobilePhoneNumber, Long parentId, NewParentRequest newParent, Long teamId) {
        assertCallerMayCreate(roleName);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("This role does not exist"));

        String parentTemporaryPassword = null;
        Long resolvedParentId = null;
        Long resolvedTeamId = null;
        if ("PLAYER".equals(roleName)) {
            ParentLink parentLink = resolveParentIdForPlayer(parentId, newParent);
            resolvedParentId = parentLink.parentId();
            parentTemporaryPassword = parentLink.temporaryPassword();
            resolvedTeamId = resolveTeamIdForPlayer(teamId);
        }

        SavedUser saved = saveNewUser(
                name, email, role.getId(), playerNumber, mobilePhoneNumber, resolvedParentId, resolvedTeamId);
        return new CreatedUserResult(saved.user(), saved.temporaryPassword(), parentTemporaryPassword);
    }

    private void assertCallerMayCreate(String roleName) {
        if (hasRole("ADMIN")) {
            return;
        }
        if (hasRole("COACH") && "PLAYER".equals(roleName)) {
            return;
        }
        throw new AccessDeniedException("Only ADMIN or COACH can create users; COACH may only create PLAYER");
    }

    private boolean hasRole(String roleName) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        String expected = "ROLE_" + roleName;
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (expected.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    private Long resolveTeamIdForPlayer(Long teamId) {
        if (teamId == null) {
            throw new BadRequestException("A PLAYER needs a teamId");
        }
        teamRepository.findById(teamId)
                .orElseThrow(() -> new BadRequestException("Team not found"));
        return teamId;
    }

    private ParentLink resolveParentIdForPlayer(Long parentId, NewParentRequest newParent) {
        boolean hasExisting = parentId != null;
        boolean hasNew = newParent != null;

        if (hasExisting == hasNew) {
            throw new BadRequestException(
                    "A PLAYER needs exactly one parent: send parentId or newParent, not both or neither");
        }

        if (hasExisting) {
            AppUser parent = userRepository.findById(parentId)
                    .orElseThrow(() -> new BadRequestException("Parent user not found"));
            String parentRoleName = getRoleName(parent.getRoleId());
            if (!"PARENT".equals(parentRoleName)) {
                throw new BadRequestException("parentId must point to a user with role PARENT");
            }
            return new ParentLink(parent.getId(), null);
        }

        requireNonBlank(newParent.getName(), "New parent name is required");
        requireNonBlank(newParent.getEmail(), "New parent email is required");
        requireNonBlank(newParent.getMobilePhoneNumber(), "New parent phone is required");

        Role parentRole = roleRepository.findByName("PARENT")
                .orElseThrow(() -> new BadRequestException("This role does not exist"));

        SavedUser createdParent = saveNewUser(
                newParent.getName().trim(),
                newParent.getEmail().trim(),
                parentRole.getId(),
                null,
                newParent.getMobilePhoneNumber().trim(),
                null,
                null);
        return new ParentLink(createdParent.user().getId(), createdParent.temporaryPassword());
    }

    private SavedUser saveNewUser(String name, String email, Long roleId, Integer playerNumber,
            String mobilePhoneNumber, Long parentId, Long teamId) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new BadRequestException("User already exists");
        }
        if (mobilePhoneNumber != null && !mobilePhoneNumber.isBlank()
                && userRepository.findByMobilePhoneNumber(mobilePhoneNumber).isPresent()) {
            throw new BadRequestException("Phone number already in use");
        }

        String temporaryPassword = generateTemporaryPassword();

        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(roleId);
        user.setPlayerNumber(playerNumber);
        user.setMobilePhoneNumber(mobilePhoneNumber);
        user.setParentId(parentId);
        user.setTeamId(teamId);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        AppUser saved = userRepository.save(user);
        return new SavedUser(saved, temporaryPassword);
    }

    private String generateTemporaryPassword() {
        StringBuilder builder = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            int index = secureRandom.nextInt(TEMP_PASSWORD_CHARS.length());
            builder.append(TEMP_PASSWORD_CHARS.charAt(index));
        }
        return builder.toString();
    }

    /**
     * Update a PLAYER. Team can change but not become null.
     * Parent link can change; parent name/email/phone update the linked PARENT row.
     */
    @Transactional
    public AppUser updatePlayer(Long id, String name, String email, String mobilePhoneNumber,
            Integer playerNumber, Long teamId, Long parentId, String parentName, String parentEmail,
            String parentMobilePhoneNumber) {
        AppUser player = getUserById(id);
        if (!"PLAYER".equals(getRoleName(player.getRoleId()))) {
            throw new BadRequestException("Only a PLAYER can be updated with this endpoint");
        }
        if (!player.isActive()) {
            throw new BadRequestException("Cannot edit an inactive player");
        }

        requireNonBlank(name, "Name is required");
        requireNonBlank(email, "Email is required");
        if (teamId == null) {
            throw new BadRequestException("teamId is required (change team, do not clear it)");
        }
        resolveTeamIdForPlayer(teamId);

        assertEmailAvailable(email, player.getId());
        assertPhoneAvailable(mobilePhoneNumber, player.getId());
        assertShirtAvailable(playerNumber, player.getId());

        player.setName(name.trim());
        player.setEmail(email.trim());
        player.setMobilePhoneNumber(blankToNull(mobilePhoneNumber));
        player.setPlayerNumber(playerNumber);
        player.setTeamId(teamId);

        if (parentId != null) {
            AppUser parent = userRepository.findById(parentId)
                    .orElseThrow(() -> new BadRequestException("Parent user not found"));
            if (!"PARENT".equals(getRoleName(parent.getRoleId()))) {
                throw new BadRequestException("parentId must point to a user with role PARENT");
            }
            if (!parent.isActive()) {
                throw new BadRequestException("Cannot link an inactive parent");
            }
            player.setParentId(parentId);
        }

        if (player.getParentId() != null
                && (parentName != null || parentEmail != null || parentMobilePhoneNumber != null)) {
            AppUser parent = getUserById(player.getParentId());
            if (parentName != null && !parentName.isBlank()) {
                parent.setName(parentName.trim());
            }
            if (parentEmail != null) {
                requireNonBlank(parentEmail, "Parent email is required");
                assertEmailAvailable(parentEmail, parent.getId());
                parent.setEmail(parentEmail.trim());
            }
            if (parentMobilePhoneNumber != null) {
                String phone = blankToNull(parentMobilePhoneNumber);
                if (phone != null) {
                    assertPhoneAvailable(phone, parent.getId());
                }
                parent.setMobilePhoneNumber(phone);
            }
            userRepository.save(parent);
        }

        return userRepository.save(player);
    }

    /** Soft-delete a PLAYER (active = false). Row stays in the database. */
    @Transactional
    public AppUser softDeletePlayer(Long id) {
        AppUser player = getUserById(id);
        if (!"PLAYER".equals(getRoleName(player.getRoleId()))) {
            throw new BadRequestException("Only a PLAYER can be removed this way");
        }
        if (!player.isActive()) {
            throw new BadRequestException("Player is already inactive");
        }
        player.setActive(false);
        return userRepository.save(player);
    }

    private void assertEmailAvailable(String email, Long currentUserId) {
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmail(email.trim()).ifPresent(other -> {
            if (!other.getId().equals(currentUserId)) {
                throw new BadRequestException("Email already in use");
            }
        });
    }

    private void assertPhoneAvailable(String mobilePhoneNumber, Long currentUserId) {
        if (mobilePhoneNumber == null || mobilePhoneNumber.isBlank()) {
            return;
        }
        userRepository.findByMobilePhoneNumber(mobilePhoneNumber.trim()).ifPresent(other -> {
            if (!other.getId().equals(currentUserId)) {
                throw new BadRequestException("Phone number already in use");
            }
        });
    }

    private void assertShirtAvailable(Integer playerNumber, Long currentUserId) {
        if (playerNumber == null) {
            return;
        }
        userRepository.findByPlayerNumber(playerNumber).ifPresent(other -> {
            if (!other.getId().equals(currentUserId)) {
                throw new BadRequestException("Shirt number already in use");
            }
        });
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }

    public AppUser getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    public String getRoleName(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("This role does not exist"))
                .getName();
    }

    /** Parent display name for responses. Null if the user has no parent. */
    public String getParentName(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return userRepository.findById(parentId)
                .map(AppUser::getName)
                .orElse(null);
    }

    /** Parent email for responses. Null if the user has no parent. */
    public String getParentEmail(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return userRepository.findById(parentId)
                .map(AppUser::getEmail)
                .orElse(null);
    }

    /** Parent phone for responses. Null if the user has no parent. */
    public String getParentMobilePhoneNumber(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return userRepository.findById(parentId)
                .map(AppUser::getMobilePhoneNumber)
                .orElse(null);
    }

    /** Team display name for responses. Null if the user has no team. */
    public String getTeamName(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return teamRepository.findById(teamId)
                .map(Team::getName)
                .orElse(null);
    }

    public AppUser changeUserRole(Long id, String roleName) {
        AppUser user = getUserById(id);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("This role does not exist"));
        user.setRoleId(role.getId());
        return userRepository.save(user);
    }

    public List<AppUser> getAllUsers() {
        return userRepository.findByActiveTrue();
    }

    /**
     * Partial name search. Returns a list because several people can match
     * the same letters. Blank or null is rejected so we do not search for
     * everything. Inactive users are hidden.
     */
    public List<AppUser> searchByName(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Name cannot be null or blank");
        }
        return userRepository.findByNameContainingIgnoreCaseAndActiveTrue(name);
    }

    /**
     * Exact shirt-number search. Returns one user because the number is unique.
     * Null is rejected. Missing number throws, same idea as getUserById.
     */
    public AppUser searchByPlayerNumber(Integer playerNumber) {
        if (playerNumber == null) {
            throw new BadRequestException("Player number cannot be null");
        }
        AppUser user = userRepository.findByPlayerNumber(playerNumber)
                .orElseThrow(() -> new NotFoundException("No user found with player number " + playerNumber));
        if (!user.isActive()) {
            throw new NotFoundException("No user found with player number " + playerNumber);
        }
        return user;
    }

    /**
     * Exact phone search. Returns one user because the number is unique when set.
     * Blank or null is rejected. Missing number throws, same idea as getUserById.
     */
    public AppUser searchByMobilePhoneNumber(String mobilePhoneNumber) {
        if (mobilePhoneNumber == null || mobilePhoneNumber.isBlank()) {
            throw new BadRequestException("Phone number cannot be null or blank");
        }
        AppUser user = userRepository.findByMobilePhoneNumber(mobilePhoneNumber)
                .orElseThrow(() -> new NotFoundException(
                        "No user found with phone number " + mobilePhoneNumber));
        if (!user.isActive()) {
            throw new NotFoundException("No user found with phone number " + mobilePhoneNumber);
        }
        return user;
    }

    private record SavedUser(AppUser user, String temporaryPassword) {
    }

    private record ParentLink(Long parentId, String temporaryPassword) {
    }
}
