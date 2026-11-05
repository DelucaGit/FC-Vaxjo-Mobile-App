package se.fcvaxjo.api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Decides if a JWT may still be used.
 *
 * A token is signed for 120 minutes. Deactivating an account or changing a
 * role must stop that token on the next request, so this reads the user from
 * the database instead of trusting the role written inside the token.
 */
@Service
public class AccountAccessService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public AccountAccessService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    /**
     * Both reads share one transaction so a role change cannot slip in
     * between "the user is active" and "this is their role".
     */
    @Transactional(readOnly = true)
    public boolean tokenStillMatchesAccount(Long userId, String roleNameInToken) {
        if (userId == null || roleNameInToken == null || roleNameInToken.isBlank()) {
            return false;
        }

        AppUser user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) {
            return false;
        }

        String currentRoleName = findRoleName(user.getRoleId());
        return roleNameInToken.equals(currentRoleName);
    }

    private String findRoleName(Long roleId) {
        if (roleId == null) {
            return null;
        }

        Role role = roleRepository.findById(roleId).orElse(null);
        if (role == null) {
            return null;
        }
        return role.getName();
    }
}
