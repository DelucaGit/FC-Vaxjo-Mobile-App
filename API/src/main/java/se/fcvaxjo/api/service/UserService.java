package se.fcvaxjo.api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.DTO.NewParentRequest;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    /**
     * Creates a user. When role is PLAYER, exactly one of parentId or newParent
     * is required. newParent needs name, email, and phone. Both saves run in
     * one transaction so a failed player does not leave an orphan parent.
     */
    @Transactional
    public AppUser createUser(String name, String email, String roleName, Integer playerNumber,
            String mobilePhoneNumber, Long parentId, NewParentRequest newParent) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("This role does not exist"));

        Long resolvedParentId = null;
        if ("PLAYER".equals(roleName)) {
            resolvedParentId = resolveParentIdForPlayer(parentId, newParent);
        }

        return saveNewUser(name, email, role.getId(), playerNumber, mobilePhoneNumber, resolvedParentId);
    }

    private Long resolveParentIdForPlayer(Long parentId, NewParentRequest newParent) {
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
            return parent.getId();
        }

        requireNonBlank(newParent.getName(), "New parent name is required");
        requireNonBlank(newParent.getEmail(), "New parent email is required");
        requireNonBlank(newParent.getMobilePhoneNumber(), "New parent phone is required");

        Role parentRole = roleRepository.findByName("PARENT")
                .orElseThrow(() -> new BadRequestException("This role does not exist"));

        AppUser createdParent = saveNewUser(
                newParent.getName().trim(),
                newParent.getEmail().trim(),
                parentRole.getId(),
                null,
                newParent.getMobilePhoneNumber().trim(),
                null);
        return createdParent.getId();
    }

    private AppUser saveNewUser(String name, String email, Long roleId, Integer playerNumber,
            String mobilePhoneNumber, Long parentId) {
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

        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(roleId);
        user.setPlayerNumber(playerNumber);
        user.setMobilePhoneNumber(mobilePhoneNumber);
        user.setParentId(parentId);
        return userRepository.save(user);
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

    public AppUser changeUserRole(Long id, String roleName) {
        AppUser user = getUserById(id);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("This role does not exist"));
        user.setRoleId(role.getId());
        return userRepository.save(user);
    }

    public List<AppUser> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Partial name search. Returns a list because several people can match
     * the same letters. Blank or null is rejected so we do not search for
     * everything.
     */
    public List<AppUser> searchByName(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Name cannot be null or blank");
        }
        return userRepository.findByNameContainingIgnoreCase(name);
    }

    /**
     * Exact shirt-number search. Returns one user because the number is unique.
     * Null is rejected. Missing number throws, same idea as getUserById.
     */
    public AppUser searchByPlayerNumber(Integer playerNumber) {
        if (playerNumber == null) {
            throw new BadRequestException("Player number cannot be null");
        }
        return userRepository.findByPlayerNumber(playerNumber)
                .orElseThrow(() -> new NotFoundException("No user found with player number " + playerNumber));
    }

    /**
     * Exact phone search. Returns one user because the number is unique when set.
     * Blank or null is rejected. Missing number throws, same idea as getUserById.
     */
    public AppUser searchByMobilePhoneNumber(String mobilePhoneNumber) {
        if (mobilePhoneNumber == null || mobilePhoneNumber.isBlank()) {
            throw new BadRequestException("Phone number cannot be null or blank");
        }
        return userRepository.findByMobilePhoneNumber(mobilePhoneNumber)
                .orElseThrow(() -> new NotFoundException(
                        "No user found with phone number " + mobilePhoneNumber));
    }
}
