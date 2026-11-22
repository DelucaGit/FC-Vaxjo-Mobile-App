package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.DTO.CreateLeaveRequestRequest;
import se.fcvaxjo.api.DTO.LeaveRequestResponse;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.LeaveReasonType;
import se.fcvaxjo.api.model.LeaveRequest;
import se.fcvaxjo.api.model.LeaveRequestStatus;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.MatchStatus;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingStatus;
import se.fcvaxjo.api.repository.LeaveRequestRepository;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Leave requests for PLAYER (self) and PARENT (own children), issue #210.
 * The controller only lets PLAYER and PARENT in; this class checks which player.
 */
@Service
public class LeaveRequestService {

    static final int OTHER_TEXT_MIN_LENGTH = 5;

    static final String NEED_ONE_ACTIVITY = "Ange antingen en träning eller en match.";
    static final String NEED_REASON_TYPE =
            "Välj en orsak: SICK, SCHOOL, FAMILY, INJURY eller OTHER.";
    static final String OTHER_NEEDS_TEXT = "Skriv en orsak med minst 5 tecken när du väljer Annat.";
    static final String NEED_PLAYER = "Ange vilket barn ledigheten gäller.";
    static final String NOT_YOUR_PLAYER = "Du kan bara begära ledigt för dig själv eller dina egna barn.";
    static final String WRONG_TEAM = "Spelaren hör inte till aktivitetens lag.";
    static final String CANCELLED = "Aktiviteten är inställd.";
    static final String ALREADY_STARTED = "Aktiviteten har redan börjat. Ledighet kan bara begäras före start.";
    static final String DUPLICATE = "Det finns redan en ledighetsbegäran för den här aktiviteten.";
    static final String NOT_FOUND = "Ledighetsbegäran hittades inte.";
    static final String ALREADY_ANSWERED = "Begäran är redan besvarad och kan inte dras tillbaka.";

    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final TrainingRepository trainingRepository;
    private final MatchRepository matchRepository;
    private final UserService userService;
    private final TeamService teamService;
    private final Clock clock;

    public LeaveRequestService(
            LeaveRequestRepository leaveRequestRepository,
            UserRepository userRepository,
            TrainingRepository trainingRepository,
            MatchRepository matchRepository,
            UserService userService,
            TeamService teamService,
            Clock clock) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.trainingRepository = trainingRepository;
        this.matchRepository = matchRepository;
        this.userService = userService;
        this.teamService = teamService;
        this.clock = clock;
    }

    @Transactional
    public LeaveRequestResponse create(CreateLeaveRequestRequest request) {
        if ((request.getTrainingId() == null) == (request.getMatchId() == null)) {
            throw new BadRequestException(NEED_ONE_ACTIVITY);
        }
        LeaveReasonType reasonType = parseReasonType(request.getReasonType());
        String reasonText = request.getReasonText() == null ? null : request.getReasonText().trim();
        if (reasonText != null && reasonText.isEmpty()) {
            reasonText = null;
        }
        if (reasonType == LeaveReasonType.OTHER
                && (reasonText == null || reasonText.length() < OTHER_TEXT_MIN_LENGTH)) {
            throw new BadRequestException(OTHER_NEEDS_TEXT);
        }

        Long me = currentUserId();
        AppUser player = resolvePlayerForCreate(me, request.getPlayerUserId());

        Long activityTeamId;
        LocalDateTime startsAt;
        boolean cancelled;
        boolean duplicate;
        if (request.getTrainingId() != null) {
            Training training = trainingRepository.findById(request.getTrainingId())
                    .orElseThrow(() -> new NotFoundException("Träningen hittades inte."));
            activityTeamId = training.getTeamId();
            startsAt = training.getStartsAt();
            cancelled = training.statusOrScheduled() == TrainingStatus.CANCELLED;
            duplicate = leaveRequestRepository.existsByPlayerUserIdAndTrainingId(player.getId(), training.getId());
        } else {
            Match match = matchRepository.findById(request.getMatchId())
                    .orElseThrow(() -> new NotFoundException("Matchen hittades inte."));
            activityTeamId = match.getTeamId();
            startsAt = match.getKickoffAt();
            cancelled = match.statusOrScheduled() == MatchStatus.CANCELLED;
            duplicate = leaveRequestRepository.existsByPlayerUserIdAndMatchId(player.getId(), match.getId());
        }

        if (player.getTeamId() == null || !player.getTeamId().equals(activityTeamId)) {
            throw new AccessDeniedException(WRONG_TEAM);
        }
        if (cancelled) {
            throw new BadRequestException(CANCELLED);
        }
        if (!now().isBefore(startsAt)) {
            throw new BadRequestException(ALREADY_STARTED);
        }
        if (duplicate) {
            throw new BadRequestException(DUPLICATE);
        }

        LeaveRequest row = new LeaveRequest();
        row.setPlayerUserId(player.getId());
        row.setRequestedByUserId(me);
        row.setTrainingId(request.getTrainingId());
        row.setMatchId(request.getMatchId());
        row.setReasonType(reasonType);
        row.setReasonText(reasonText);
        row.setStatus(LeaveRequestStatus.PENDING);
        row.setCreatedAt(now());
        return toResponse(leaveRequestRepository.save(row));
    }

    /** PLAYER: own requests (no childId). PARENT: all own children, or only childId. */
    public List<LeaveRequestResponse> listMine(Long childId) {
        Long me = currentUserId();
        List<Long> playerIds = new ArrayList<>();
        if (hasRole("PLAYER")) {
            if (childId != null) {
                throw new AccessDeniedException(NOT_YOUR_PLAYER);
            }
            playerIds.add(me);
        } else if (hasRole("PARENT")) {
            for (AppUser child : myChildren(me)) {
                if (childId == null || childId.equals(child.getId())) {
                    playerIds.add(child.getId());
                }
            }
            if (childId != null && playerIds.isEmpty()) {
                throw new AccessDeniedException(NOT_YOUR_PLAYER);
            }
        } else {
            throw new AccessDeniedException(NOT_YOUR_PLAYER);
        }
        if (playerIds.isEmpty()) {
            return List.of();
        }
        List<LeaveRequestResponse> responses = new ArrayList<>();
        for (LeaveRequest row : leaveRequestRepository.findByPlayerUserIdInOrderByCreatedAtDescIdDesc(playerIds)) {
            responses.add(toResponse(row));
        }
        return responses;
    }

    /** Deletes a PENDING request for self or own child. Someone else's request looks like a missing one (404). */
    @Transactional
    public void withdraw(Long id) {
        Long me = currentUserId();
        LeaveRequest row = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(NOT_FOUND));
        if (!mayAct(me, row.getPlayerUserId())) {
            throw new NotFoundException(NOT_FOUND);
        }
        if (row.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BadRequestException(ALREADY_ANSWERED);
        }
        leaveRequestRepository.delete(row);
    }

    private boolean mayAct(Long me, Long playerUserId) {
        if (hasRole("PLAYER")) {
            return me.equals(playerUserId);
        }
        if (hasRole("PARENT")) {
            for (AppUser child : myChildren(me)) {
                if (child.getId().equals(playerUserId)) {
                    return true;
                }
            }
        }
        return false;
    }

    private AppUser resolvePlayerForCreate(Long me, Long playerUserId) {
        if (hasRole("PLAYER")) {
            if (playerUserId != null && !playerUserId.equals(me)) {
                throw new AccessDeniedException(NOT_YOUR_PLAYER);
            }
            AppUser self = userRepository.findById(me)
                    .orElseThrow(() -> new NotFoundException("Användaren hittades inte."));
            if (!isActivePlayer(self)) {
                throw new AccessDeniedException(NOT_YOUR_PLAYER);
            }
            return self;
        }
        if (hasRole("PARENT")) {
            if (playerUserId == null) {
                throw new BadRequestException(NEED_PLAYER);
            }
            for (AppUser child : myChildren(me)) {
                if (child.getId().equals(playerUserId)) {
                    return child;
                }
            }
            throw new AccessDeniedException(NOT_YOUR_PLAYER);
        }
        throw new AccessDeniedException(NOT_YOUR_PLAYER);
    }

    /** Active children with the PLAYER role, same as GET /api/my/children. */
    private List<AppUser> myChildren(Long parentId) {
        List<AppUser> players = new ArrayList<>();
        for (AppUser child : userRepository.findByParentIdAndActiveTrue(parentId)) {
            if (isActivePlayer(child)) {
                players.add(child);
            }
        }
        return players;
    }

    private boolean isActivePlayer(AppUser user) {
        return user.isActive() && "PLAYER".equals(userService.getRoleName(user.getRoleId()));
    }

    private LeaveReasonType parseReasonType(String value) {
        if (value == null) {
            throw new BadRequestException(NEED_REASON_TYPE);
        }
        try {
            return LeaveReasonType.valueOf(value.trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(NEED_REASON_TYPE);
        }
    }

    private LeaveRequestResponse toResponse(LeaveRequest row) {
        String kind;
        Long activityId;
        Long teamId = null;
        LocalDateTime start = null;
        if (row.getTrainingId() != null) {
            kind = "TRAINING";
            activityId = row.getTrainingId();
            Training training = trainingRepository.findById(activityId).orElse(null);
            if (training != null) {
                teamId = training.getTeamId();
                start = training.getStartsAt();
            }
        } else {
            kind = "MATCH";
            activityId = row.getMatchId();
            Match match = matchRepository.findById(activityId).orElse(null);
            if (match != null) {
                teamId = match.getTeamId();
                start = match.getKickoffAt();
            }
        }
        String playerName = userRepository.findById(row.getPlayerUserId()).map(AppUser::getName).orElse(null);
        return new LeaveRequestResponse(
                row.getId(),
                row.getPlayerUserId(),
                playerName,
                kind,
                activityId,
                start,
                teamId,
                teamId == null ? null : teamService.getTeamName(teamId),
                row.getReasonType().name(),
                row.getReasonText(),
                row.getStatus().name(),
                row.getCoachNote(),
                row.getCreatedAt());
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ActivityStartRule.CLUB_ZONE);
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
