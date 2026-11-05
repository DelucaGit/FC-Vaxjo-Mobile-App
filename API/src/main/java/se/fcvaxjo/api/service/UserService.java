package se.fcvaxjo.api.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@Service
public class UserService {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private static final String MANAGE_PLAYERS_DENIED =
            "Only ADMIN, CHAIRMAN, or a coach of this team can manage its players";

    /**
     * A parent with no child is not on a team, so team_coaches cannot limit a coach.
     * Admin and chairman may still create that parent. They look after every team.
     */
    private static final String STANDALONE_PARENT_DENIED =
            "A COACH cannot create a standalone parent. Create the parent together with a player on a team you train";

    private static final String CREATE_DENIED =
            "Only ADMIN, CHAIRMAN or COACH can create users. A CHAIRMAN may create PLAYER, PARENT and COACH. A COACH may only create PLAYER";

    /** Same text on create and on role change, so the 403 is easy to recognise. */
    private static final String CHAIRMAN_CANNOT_ASSIGN_CLUB_LEAD =
            "CHAIRMAN cannot assign the role ADMIN or CHAIRMAN";
    private static final String CHAIRMAN_MAY_ONLY_PROMOTE_PLAYER =
            "CHAIRMAN may only change a PLAYER to COACH";
    private static final String CANNOT_CHANGE_OWN_ROLE =
            "You cannot change your own role";

    private static final String READ_OWN_RECORD =
            "You can only read your own user record";

    /** A coach opened a person who is not on a team they train. */
    private static final String READ_OWN_TEAMS_ONLY =
            "You can only read users on a team you train";

    /** Same door as the player-roster and coach-list URLs. */
    private static final String READ_ROSTER_DENIED =
            "Only ADMIN, CHAIRMAN, or a coach of this team can read its players and coaches";

    private static final String LIST_CLUB_DENIED =
            "Only ADMIN or CHAIRMAN can list every user";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TeamRepository teamRepository;
    private final TeamCoachRepository teamCoachRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            TeamRepository teamRepository,
            TeamCoachRepository teamCoachRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.teamRepository = teamRepository;
        this.teamCoachRepository = teamCoachRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates a user with a generated temporary password.
     * ADMIN may create any role, including a parent with no child.
     * CHAIRMAN may create PLAYER, PARENT and COACH. Not ADMIN or another chairman.
     * COACH may create a PLAYER on a team they train. A new parent is allowed only
     * inside that same request, after the team check, so the parent is tied to that child.
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
            // A player always belongs to one team. Missing team is a bad request, not a permission error.
            if (teamId == null) {
                throw new BadRequestException("A PLAYER needs a teamId");
            }
            // Refuse before any insert. A coach who does not train this team must not
            // get a new parent row as a side effect of a call we are about to deny.
            assertCanManageTeam(teamId);
            ParentLink parentLink = resolveParentIdForPlayer(parentId, newParent);
            resolvedParentId = parentLink.parentId();
            parentTemporaryPassword = parentLink.temporaryPassword();
            resolvedTeamId = resolveTeamIdForPlayer(teamId);
        }

        // A coach has no shirt number. The column is unique, so a number sent
        // by mistake must not block a player from using it later.
        Integer shirtNumber = "COACH".equals(roleName) ? null : playerNumber;

        SavedUser saved = saveNewUser(
                name, email, role.getId(), shirtNumber, mobilePhoneNumber, resolvedParentId, resolvedTeamId);
        return new CreatedUserResult(saved.user(), saved.temporaryPassword(), parentTemporaryPassword);
    }

    private void assertCallerMayCreate(String roleName) {
        if (hasRole("ADMIN")) {
            return;
        }
        if (hasRole("CHAIRMAN") && chairmanMayCreateThisRole(roleName)) {
            return;
        }
        if (hasRole("COACH") && coachMayCreateThisRole(roleName)) {
            return;
        }
        throw new AccessDeniedException(deniedCreateMessage(roleName));
    }

    /**
     * The chairman looks after the whole club, so a player or parent does not have to
     * sit on one of the chairman's teams. A coach is allowed too, so a youth player
     * can be invited in as staff. ADMIN and CHAIRMAN stay with the admin account.
     */
    private boolean chairmanMayCreateThisRole(String roleName) {
        return "PLAYER".equals(roleName) || "PARENT".equals(roleName) || "COACH".equals(roleName);
    }

    /**
     * A coach's parent must belong to a child on one of the coach's teams.
     * That only happens via newParent on a PLAYER. A PARENT row on its own has no team to check.
     */
    private boolean coachMayCreateThisRole(String roleName) {
        return "PLAYER".equals(roleName);
    }

    private String deniedCreateMessage(String roleName) {
        if (hasRole("COACH") && "PARENT".equals(roleName)) {
            return STANDALONE_PARENT_DENIED;
        }
        if (hasRole("CHAIRMAN") && isClubLeadRole(roleName)) {
            return CHAIRMAN_CANNOT_ASSIGN_CLUB_LEAD;
        }
        return CREATE_DENIED;
    }

    /**
     * Admin and chairman may manage players on any team.
     * A coach is allowed only for teams they train.
     * Called before we check that the team row exists, for the same reason as trainings:
     * a coach should get 403 for someone else's team id, not 400 "Team not found",
     * so the error does not reveal which ids exist.
     */
    private void assertCanManageTeam(Long teamId) {
        if (callerLooksAfterEveryTeam()) {
            return;
        }
        if (coachTrainsTeam(teamId)) {
            return;
        }
        throw new AccessDeniedException(MANAGE_PLAYERS_DENIED);
    }

    /**
     * Admin and chairman are responsible for every team.
     * A coach is not, so they still need a row in team_coaches.
     */
    private boolean callerLooksAfterEveryTeam() {
        return hasRole("ADMIN") || hasRole("CHAIRMAN");
    }

    /**
     * A coach is linked through team_coaches, not users.team_id,
     * because the same coach can train more than one team.
     * No team id means this player is not on a team the coach trains.
     */
    private boolean coachTrainsTeam(Long teamId) {
        if (!hasRole("COACH") || teamId == null) {
            return false;
        }
        return teamCoachRepository.existsByTeamIdAndUserId(teamId, currentUserId());
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new AccessDeniedException("Not logged in");
        }
        return id;
    }

    private boolean isClubLeadRole(String roleName) {
        for (ClubRole role : ClubRole.values()) {
            if (role.name().equals(roleName)) {
                return role.isClubLead();
            }
        }
        return false;
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
        // Current team before other checks, so a coach of another team gets 403
        // and not a 400 that describes this player's state.
        assertCanManageTeam(player.getTeamId());
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
        // The new team too. A coach must not move a player onto a team they do not train.
        assertCanManageTeam(teamId);
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
        // Same team rule as create and update. A player with no team is not "on my team".
        assertCanManageTeam(player.getTeamId());
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

    /**
     * ADMIN and CHAIRMAN may read any user. They look after every team.
     * A coach may read a person on a team they train, and their own row.
     * A player or parent may read only their own id.
     * The check runs before the controller returns the row. A forbidden id is 403,
     * including an id that does not exist, so the caller cannot probe for rows.
     * A coach who swaps in a player from another team gets that 403, so the phone stays out.
     */
    public void assertCallerMayReadUser(Long userId) {
        if (callerReadsEveryTeam()) {
            return;
        }
        if (isLoggedInUser(userId)) {
            return;
        }
        if (hasRole("COACH") && coachMayReadUser(userId)) {
            return;
        }
        if (hasRole("COACH")) {
            throw new AccessDeniedException(READ_OWN_TEAMS_ONLY);
        }
        throw new AccessDeniedException(READ_OWN_RECORD);
    }

    /**
     * ADMIN and CHAIRMAN may open any team's roster.
     * A coach may open only a team they train. That is the same team_coaches
     * row already checked when they create or edit a player.
     * Called before the team lookup, so a swapped id is 403 and does not
     * confirm that the team exists. The player list carries the parent phone,
     * which is why this check cannot wait until after the rows are loaded.
     */
    public void assertCallerMayReadTeam(Long teamId) {
        if (callerReadsEveryTeam()) {
            return;
        }
        if (coachTrainsTeam(teamId)) {
            return;
        }
        throw new AccessDeniedException(READ_ROSTER_DENIED);
    }

    /**
     * The rule itself is {@link ClubRole#canReadEveryTeam()}.
     * The token carries one role name, so we ask each club role in turn.
     * A coach is false here. Their team check is separate, because this
     * method does not know which rows are in team_coaches.
     */
    private boolean callerReadsEveryTeam() {
        for (ClubRole role : ClubRole.values()) {
            if (hasRole(role.name()) && role.canReadEveryTeam()) {
                return true;
            }
        }
        return false;
    }

    /**
     * The player's team id uses the same team_coaches lookup as a write.
     * A coach has no users.team_id, so we also look for their link.
     * A parent has neither. They belong to the team through an active child.
     */
    private boolean coachMayReadUser(Long userId) {
        AppUser user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return false;
        }
        if (user.getTeamId() != null && coachTrainsTeam(user.getTeamId())) {
            return true;
        }
        List<Long> teamIds = teamIdsThisCoachTrains();
        if (teamIds.isEmpty() || user.getId() == null) {
            return false;
        }
        if (teamCoachRepository.existsByTeamIdInAndUserId(teamIds, user.getId())) {
            return true;
        }
        return userRepository.existsByParentIdAndTeamIdInAndActiveTrue(user.getId(), teamIds);
    }

    /** Teams linked to the logged-in coach. Empty when they train nobody. */
    private List<Long> teamIdsThisCoachTrains() {
        List<Long> teamIds = new ArrayList<>();
        for (TeamCoach link : teamCoachRepository.findByUserId(currentUserId())) {
            if (link.getTeamId() != null && !teamIds.contains(link.getTeamId())) {
                teamIds.add(link.getTeamId());
            }
        }
        return teamIds;
    }

    public AppUser getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /**
     * The JWT filter stores the user id as a Long.
     * A different principal type is not a club user we can compare.
     */
    private boolean isLoggedInUser(Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || userId == null) {
            return false;
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof Long)) {
            return false;
        }
        Long loggedInUserId = (Long) principal;
        return loggedInUserId.equals(userId);
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

    /**
     * Replaces the user's role.
     * ADMIN may set any role, including their own.
     * CHAIRMAN may only turn a PLAYER into a COACH, may never set ADMIN or CHAIRMAN,
     * and may not change their own role.
     */
    @Transactional
    public AppUser changeUserRole(Long id, String roleName) {
        AppUser user = getUserById(id);
        Role newRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BadRequestException("This role does not exist"));

        String currentRoleName = getRoleName(user.getRoleId());
        assertCallerMayChangeRole(user.getId(), currentRoleName, newRole.getName());

        if ("PLAYER".equals(currentRoleName) && "COACH".equals(newRole.getName())) {
            clearPlayerOnlyFields(user);
        }

        user.setRoleId(newRole.getId());
        return userRepository.save(user);
    }

    private void assertCallerMayChangeRole(Long targetUserId, String currentRoleName, String newRoleName) {
        if (hasRole("ADMIN")) {
            return;
        }
        // Only an admin may change their own role. A chairman must not promote themselves.
        if (targetUserId != null && targetUserId.equals(currentUserId())) {
            throw new AccessDeniedException(CANNOT_CHANGE_OWN_ROLE);
        }
        if (!hasRole("CHAIRMAN")) {
            throw new AccessDeniedException("Only ADMIN or CHAIRMAN can change roles");
        }
        if (isClubLeadRole(newRoleName)) {
            throw new AccessDeniedException(CHAIRMAN_CANNOT_ASSIGN_CLUB_LEAD);
        }
        if ("PLAYER".equals(currentRoleName) && "COACH".equals(newRoleName)) {
            return;
        }
        throw new AccessDeniedException(CHAIRMAN_MAY_ONLY_PROMOTE_PLAYER);
    }

    /**
     * A coach is not a child on a team roster.
     * These three fields belong to a player, so they must not stay behind on a coach:
     * the shirt number is unique, the parent link would still point at a coach,
     * and team_id is the player roster (coaches use team_coaches, which is a later step).
     * The parent account itself is left as it is.
     */
    private void clearPlayerOnlyFields(AppUser user) {
        user.setParentId(null);
        user.setPlayerNumber(null);
        user.setTeamId(null);
    }

    /**
     * The whole club. A coach does not get this list. They open one team roster.
     * The same rule is {@link ClubRole#canReadEveryTeam()}.
     */
    public List<AppUser> getAllUsers() {
        if (!callerReadsEveryTeam()) {
            throw new AccessDeniedException(LIST_CLUB_DENIED);
        }
        return userRepository.findByActiveTrue();
    }

    /**
     * Partial name search. Returns a list because several people can match
     * the same letters. Blank or null is rejected so we do not search for
     * everything. Inactive users are hidden.
     * ADMIN and CHAIRMAN search the whole club. A coach searches only people
     * on teams they train. Another team comes back as an empty list, not an error,
     * because this URL returns a list.
     */
    public List<AppUser> searchByName(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Name cannot be null or blank");
        }
        if (callerReadsEveryTeam()) {
            return userRepository.findByNameContainingIgnoreCaseAndActiveTrue(name);
        }
        assertCallerMaySearchAsCoach();
        return searchOwnTeamsByName(name);
    }

    /**
     * Exact shirt-number search. Returns one user because the number is unique.
     * Null is rejected. Missing number throws, same idea as getUserById.
     * A coach who does not train that player's team gets the same 404 as a
     * number that is not in the club. The sentence is unchanged on purpose.
     */
    public AppUser searchByPlayerNumber(Integer playerNumber) {
        if (playerNumber == null) {
            throw new BadRequestException("Player number cannot be null");
        }
        if (callerReadsEveryTeam()) {
            return findActiveUserByPlayerNumber(playerNumber);
        }
        assertCallerMaySearchAsCoach();
        return findShirtOnOwnTeams(playerNumber);
    }

    /**
     * Exact phone search. Returns one user because the number is unique when set.
     * Blank or null is rejected. A missing or inactive number throws, same idea as getUserById.
     * The 404 text does not repeat the number. The caller already sent it, and a phone
     * number is personal data (ADR 0004, S1-12). An inactive row uses the same text, so the
     * answer does not reveal which of the two cases it was.
     * A coach who does not train that person's team gets that same 404. The text stays
     * "User not found", so another team looks like a number that is not in the club.
     */
    public AppUser searchByMobilePhoneNumber(String mobilePhoneNumber) {
        if (mobilePhoneNumber == null || mobilePhoneNumber.isBlank()) {
            throw new BadRequestException("Phone number cannot be null or blank");
        }
        if (callerReadsEveryTeam()) {
            return findActiveUserByPhone(mobilePhoneNumber);
        }
        assertCallerMaySearchAsCoach();
        return findPhoneOnOwnTeams(mobilePhoneNumber);
    }

    /**
     * Player and parent are already stopped at the controller.
     * This keeps a direct service call from searching the whole club.
     */
    private void assertCallerMaySearchAsCoach() {
        if (hasRole("COACH")) {
            return;
        }
        throw new AccessDeniedException("You cannot search other people");
    }

    private AppUser findActiveUserByPlayerNumber(Integer playerNumber) {
        AppUser user = userRepository.findByPlayerNumber(playerNumber)
                .orElseThrow(() -> missingShirt(playerNumber));
        if (!user.isActive()) {
            throw missingShirt(playerNumber);
        }
        return user;
    }

    private AppUser findActiveUserByPhone(String mobilePhoneNumber) {
        AppUser user = userRepository.findByMobilePhoneNumber(mobilePhoneNumber)
                .orElseThrow(this::missingPhone);
        if (!user.isActive()) {
            throw missingPhone();
        }
        return user;
    }

    /**
     * Players live on users.team_id. A shirt number belongs to a player,
     * so the other kinds of team member are not asked.
     */
    private AppUser findShirtOnOwnTeams(Integer playerNumber) {
        List<Long> teamIds = teamIdsThisCoachTrains();
        if (teamIds.isEmpty()) {
            throw missingShirt(playerNumber);
        }
        return userRepository.findByPlayerNumberAndActiveTrueAndTeamIdIn(playerNumber, teamIds)
                .orElseThrow(() -> missingShirt(playerNumber));
    }

    /**
     * Three places a phone can sit on the coach's teams: the player row,
     * a coach linked in team_coaches, or the parent of an active player.
     * Each query is limited to those ids. We never load the rest of the club.
     */
    private AppUser findPhoneOnOwnTeams(String mobilePhoneNumber) {
        List<Long> teamIds = teamIdsThisCoachTrains();
        if (teamIds.isEmpty()) {
            throw missingPhone();
        }
        Optional<AppUser> onTeam = userRepository
                .findByMobilePhoneNumberAndActiveTrueAndTeamIdIn(mobilePhoneNumber, teamIds);
        if (onTeam.isPresent()) {
            return onTeam.get();
        }
        List<Long> coachIds = coachIdsOnTeams(teamIds);
        if (!coachIds.isEmpty()) {
            Optional<AppUser> coach = userRepository
                    .findByMobilePhoneNumberAndActiveTrueAndIdIn(mobilePhoneNumber, coachIds);
            if (coach.isPresent()) {
                return coach.get();
            }
        }
        List<Long> parentIds = parentIdsOfActivePlayers(teamIds);
        if (!parentIds.isEmpty()) {
            Optional<AppUser> parent = userRepository
                    .findByMobilePhoneNumberAndActiveTrueAndIdIn(mobilePhoneNumber, parentIds);
            if (parent.isPresent()) {
                return parent.get();
            }
        }
        throw missingPhone();
    }

    private List<AppUser> searchOwnTeamsByName(String name) {
        List<Long> teamIds = teamIdsThisCoachTrains();
        if (teamIds.isEmpty()) {
            return List.of();
        }
        List<AppUser> matches = new ArrayList<>(
                userRepository.findByNameContainingIgnoreCaseAndActiveTrueAndTeamIdIn(name, teamIds));
        addUsersNotAlreadyListed(matches, usersWithTheseIdsWhoseNameMatches(coachIdsOnTeams(teamIds), name));
        addUsersNotAlreadyListed(matches, usersWithTheseIdsWhoseNameMatches(parentIdsOfActivePlayers(teamIds), name));
        return matches;
    }

    private List<AppUser> usersWithTheseIdsWhoseNameMatches(List<Long> userIds, String name) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return userRepository.findByIdInAndNameContainingIgnoreCaseAndActiveTrue(userIds, name);
    }

    /** One person can match as a player and again as a coach if the data is odd. Keep one row. */
    private void addUsersNotAlreadyListed(List<AppUser> matches, List<AppUser> more) {
        for (AppUser user : more) {
            if (user.getId() != null && !alreadyListed(matches, user.getId())) {
                matches.add(user);
            }
        }
    }

    private boolean alreadyListed(List<AppUser> matches, Long userId) {
        for (AppUser listed : matches) {
            if (userId.equals(listed.getId())) {
                return true;
            }
        }
        return false;
    }

    private List<Long> coachIdsOnTeams(List<Long> teamIds) {
        List<Long> coachIds = new ArrayList<>();
        for (TeamCoach link : teamCoachRepository.findByTeamIdIn(teamIds)) {
            if (link.getUserId() != null && !coachIds.contains(link.getUserId())) {
                coachIds.add(link.getUserId());
            }
        }
        return coachIds;
    }

    private List<Long> parentIdsOfActivePlayers(List<Long> teamIds) {
        List<Long> parentIds = new ArrayList<>();
        for (AppUser player : userRepository.findByTeamIdInAndActiveTrue(teamIds)) {
            if (player.getParentId() != null && !parentIds.contains(player.getParentId())) {
                parentIds.add(player.getParentId());
            }
        }
        return parentIds;
    }

    /**
     * Same sentence the club-wide search already used.
     * Story S1-12 owns changing this text. This story only chooses when it is thrown.
     */
    private NotFoundException missingShirt(Integer playerNumber) {
        return new NotFoundException("No user found with player number " + playerNumber);
    }

    /**
     * Same words as GET of a missing user (S1-12).
     * The number is not included. A phone number is personal data (ADR 0004).
     * Inactive, missing, and "another team" all use this one sentence.
     */
    private NotFoundException missingPhone() {
        return new NotFoundException("User not found");
    }

    private record SavedUser(AppUser user, String temporaryPassword) {
    }

    private record ParentLink(Long parentId, String temporaryPassword) {
    }
}
