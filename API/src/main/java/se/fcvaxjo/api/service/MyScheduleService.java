package se.fcvaxjo.api.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Read-only schedule for PLAYER (own team) and PARENT (linked child).
 */
@Service
public class MyScheduleService {

    private final UserRepository userRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final MatchRepository matchRepository;
    private final TeamCoachRepository teamCoachRepository;
    private final UserService userService;
    private final TeamService teamService;

    public MyScheduleService(
            UserRepository userRepository,
            TrainingRepository trainingRepository,
            TrainingAttendanceRepository attendanceRepository,
            MatchRepository matchRepository,
            TeamCoachRepository teamCoachRepository,
            UserService userService,
            TeamService teamService) {
        this.userRepository = userRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.matchRepository = matchRepository;
        this.teamCoachRepository = teamCoachRepository;
        this.userService = userService;
        this.teamService = teamService;
    }

    public List<AppUser> listMyChildren() {
        assertHasRole("PARENT");
        List<AppUser> children = userRepository.findByParentIdAndActiveTrue(currentUserId());
        List<AppUser> players = new ArrayList<>();
        for (AppUser child : children) {
            if ("PLAYER".equals(userService.getRoleName(child.getRoleId()))) {
                players.add(child);
            }
        }
        return players;
    }

    /**
     * PLAYER: trainings for own team + own status.
     * PARENT: must pass childId of a linked child (empty list if no children).
     */
    public List<ScheduleRow> listMyTrainings(Long childId) {
        AppUser target = resolveTargetPlayer(childId);
        if (target == null) {
            return List.of();
        }

        if (target.getTeamId() == null) {
            return List.of();
        }

        List<Training> trainings =
                trainingRepository.findByTeamIdOrderByStartsAtDesc(target.getTeamId());
        List<ScheduleRow> rows = new ArrayList<>();
        for (Training training : trainings) {
            String status = null;
            var attendance = attendanceRepository.findByTrainingIdAndPlayerUserId(
                    training.getId(), target.getId());
            if (attendance.isPresent() && attendance.get().getStatus() != null) {
                status = attendance.get().getStatus().name();
            }
            rows.add(new ScheduleRow(training, target, status));
        }
        return rows;
    }

    /**
     * Same person check as {@link #listMyTrainings(Long)}.
     * PLAYER sees matches for their own team. PARENT must pass a linked child.
     */
    public List<Match> listMyMatches(Long childId) {
        AppUser target = resolveTargetPlayer(childId);
        if (target == null || target.getTeamId() == null) {
            return List.of();
        }
        return matchRepository.findByTeamIdOrderByKickoffAtDesc(target.getTeamId());
    }

    /**
     * Same person check as {@link #listMyTrainings(Long)}.
     * Returns the active coaches (team_coaches) of the player's own team, so the family
     * can reach the coach. Never another team's coaches (ADR 0009).
     */
    public List<AppUser> listMyCoaches(Long childId) {
        AppUser target = resolveTargetPlayer(childId);
        if (target == null || target.getTeamId() == null) {
            return List.of();
        }
        List<AppUser> coaches = new ArrayList<>();
        for (TeamCoach link : teamCoachRepository.findByTeamId(target.getTeamId())) {
            userRepository.findById(link.getUserId()).ifPresent(user -> {
                if (user.isActive()) {
                    coaches.add(user);
                }
            });
        }
        return coaches;
    }

    public String getTeamName(Long teamId) {
        return teamService.getTeamName(teamId);
    }

    /**
     * @return target player, or null when a parent has no children (empty schedule)
     */
    private AppUser resolveTargetPlayer(Long childId) {
        Long me = currentUserId();
        AppUser self = userRepository.findById(me)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (hasRole("PLAYER")) {
            if (childId != null) {
                throw new AccessDeniedException("Players can only view their own schedule");
            }
            if (!"PLAYER".equals(userService.getRoleName(self.getRoleId()))) {
                throw new AccessDeniedException("Not a player");
            }
            return self;
        }

        if (hasRole("PARENT")) {
            List<AppUser> children = listMyChildren();
            if (children.isEmpty()) {
                if (childId != null) {
                    throw new AccessDeniedException("That child is not linked to you");
                }
                return null;
            }
            if (childId == null) {
                throw new BadRequestException("childId is required for parents");
            }
            AppUser child = userRepository.findById(childId)
                    .orElseThrow(() -> new NotFoundException("Player not found"));
            if (!me.equals(child.getParentId())
                    || !"PLAYER".equals(userService.getRoleName(child.getRoleId()))
                    || !child.isActive()) {
                throw new AccessDeniedException("That child is not linked to you");
            }
            return child;
        }

        throw new AccessDeniedException("Only PLAYER or PARENT can view this schedule");
    }

    private void assertHasRole(String roleName) {
        if (!hasRole(roleName)) {
            throw new AccessDeniedException("Requires role " + roleName);
        }
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

    public record ScheduleRow(Training training, AppUser player, String status) {
    }
}
