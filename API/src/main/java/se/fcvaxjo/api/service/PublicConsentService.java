package se.fcvaxjo.api.service;

import java.time.Instant;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Who may publish a player's name and shirt number.
 * This app stores a parent on every player, so the child does not consent.
 * Only the linked parent may turn it on or off. Staff cannot.
 * The same 403 is used when the id is missing, inactive, or not their child,
 * so the answer does not say that the row exists.
 */
@Service
public class PublicConsentService {

    public static final String DENIED =
            "Only the linked parent can change this player's public consent";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public PublicConsentService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public AppUser setConsent(Long playerId, Boolean granted) {
        if (granted == null) {
            throw new BadRequestException("publicConsent is required");
        }
        if (!hasRole("PARENT")) {
            throw new AccessDeniedException(DENIED);
        }

        Long parentId = currentUserId();
        AppUser player = userRepository.findById(playerId).orElse(null);
        if (!parentMayConsent(player, parentId)) {
            throw new AccessDeniedException(DENIED);
        }

        if (granted) {
            // Keep the first timestamp. A second "yes" is not a new consent.
            if (player.getPublicConsentAt() == null) {
                player.setPublicConsentAt(Instant.now());
            }
        } else {
            player.setPublicConsentAt(null);
        }
        return userRepository.save(player);
    }

    /**
     * Active player, role PLAYER, and this parent is the one stored on the row.
     * A missing row, an inactive row, and someone else's child all return false.
     */
    private boolean parentMayConsent(AppUser player, Long parentId) {
        if (player == null || !player.isActive()) {
            return false;
        }
        if (player.getParentId() == null || !player.getParentId().equals(parentId)) {
            return false;
        }
        return "PLAYER".equals(roleName(player.getRoleId()));
    }

    private String roleName(Long roleId) {
        return roleRepository.findById(roleId)
                .map(role -> role.getName())
                .orElse("");
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

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new AccessDeniedException("Not logged in");
        }
        return id;
    }
}
