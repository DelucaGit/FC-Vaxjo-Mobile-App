package se.fcvaxjo.api.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Decides if a JWT may still be used.
 *
 * A token is signed for 120 minutes. Deactivating an account, changing a
 * role, or changing the password must stop an older token on the next
 * request. This reads the user from the database instead of trusting the
 * role written inside the token.
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
     * The user read and the role read share one transaction so a role change
     * cannot slip in between "the user is active" and "this is their role".
     *
     * {@code issuedAt} is the token's {@code iat}. A password change after
     * that time rejects the token.
     */
    @Transactional(readOnly = true)
    public boolean tokenStillMatchesAccount(Long userId, String roleNameInToken, Instant issuedAt) {
        if (userId == null || roleNameInToken == null || roleNameInToken.isBlank()) {
            return false;
        }

        AppUser user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.isActive()) {
            return false;
        }
        if (passwordChangedAfterToken(user.getPasswordChangedAt(), issuedAt)) {
            return false;
        }

        String currentRoleName = findRoleName(user.getRoleId());
        return roleNameInToken.equals(currentRoleName);
    }

    /**
     * True when this token was issued before the latest password change.
     *
     * JWT {@code iat} is a whole second. {@code passwordChangedAt} also has
     * milliseconds. Comparing the raw times would treat a change in the same
     * second as "later" than a token issued in that second, so the new token
     * from change-password would be rejected at once.
     *
     * We compare whole seconds with a strict {@code >}. The token is rejected
     * only when the password was changed in a later second. A change in the
     * same second stays valid. That window is under one second, which is as
     * close as {@code iat} allows.
     * {@code >=} would reject the token from a login in that same second.
     * The new token and {@code passwordChangedAt} share a second, so the
     * login that follows the change would fail at once.
     *
     * Null means the password has not been changed since this column existed,
     * so older tokens keep working.
     * A missing {@code iat} after a real change cannot be shown to be new
     * enough, so that token is rejected.
     */
    private boolean passwordChangedAfterToken(Instant passwordChangedAt, Instant issuedAt) {
        if (passwordChangedAt == null) {
            return false;
        }
        if (issuedAt == null) {
            return true;
        }
        return passwordChangedAt.getEpochSecond() > issuedAt.getEpochSecond();
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
