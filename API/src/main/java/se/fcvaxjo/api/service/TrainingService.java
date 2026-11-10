package se.fcvaxjo.api.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.AttendanceStatus;
import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.model.TrainingStatus;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

@Service
public class TrainingService {

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final TeamService teamService;
    private final TeamCoachRepository teamCoachRepository;
    private final UserRepository userRepository;

    public TrainingService(
            TrainingRepository trainingRepository,
            TrainingAttendanceRepository attendanceRepository,
            TeamService teamService,
            TeamCoachRepository teamCoachRepository,
            UserRepository userRepository) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.teamService = teamService;
        this.teamCoachRepository = teamCoachRepository;
        this.userRepository = userRepository;
    }

    public Training createTraining(Long teamId, LocalDateTime startsAt, LocalDateTime endsAt, String title) {
        return createTraining(teamId, startsAt, endsAt, title, null);
    }

    /**
     * Creates a training and snapshots current active players on the team
     * into attendance rows (status null until marked).
     */
    @Transactional
    public Training createTraining(
            Long teamId, LocalDateTime startsAt, LocalDateTime endsAt, String title, String venue) {
        assertCanManageTeam(teamId);

        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        if (startsAt == null || endsAt == null) {
            throw new BadRequestException("startsAt and endsAt are required");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw new BadRequestException("endsAt must be after startsAt");
        }

        teamService.getTeamById(teamId);

        String resolvedTitle = resolvedTitle(title);

        Training training = new Training();
        training.setTeamId(teamId);
        training.setStartsAt(startsAt);
        training.setEndsAt(endsAt);
        training.setTitle(resolvedTitle);
        training.setVenue(blankToNull(venue));
        training.setStatus(TrainingStatus.SCHEDULED);
        training.setCreatedByUserId(currentUserId());
        Training saved = trainingRepository.save(training);

        List<AppUser> players = teamService.listPlayers(teamId);
        for (AppUser player : players) {
            TrainingAttendance row = new TrainingAttendance();
            row.setTrainingId(saved.getId());
            row.setPlayerUserId(player.getId());
            row.setStatus(null);
            attendanceRepository.save(row);
        }

        return saved;
    }

    public List<Training> listByTeam(Long teamId) {
        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        assertCanManageTeam(teamId);
        teamService.getTeamById(teamId);
        return trainingRepository.findByTeamIdOrderByStartsAtDesc(teamId);
    }

    public Training getById(Long id) {
        Training training = trainingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Training not found"));
        assertCanManageTeam(training.getTeamId());
        return training;
    }

    /**
     * Changes time, place, and title. The team stays, so the attendance rows stay.
     * A cancelled training can still be corrected. Marking attendance stays blocked.
     */
    @Transactional
    public Training updateTraining(
            Long id, LocalDateTime startsAt, LocalDateTime endsAt, String title, String venue) {
        Training training = getById(id);
        if (startsAt == null || endsAt == null) {
            throw new BadRequestException("startsAt and endsAt are required");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw new BadRequestException("endsAt must be after startsAt");
        }
        training.setStartsAt(startsAt);
        training.setEndsAt(endsAt);
        training.setTitle(resolvedTitle(title));
        training.setVenue(blankToNull(venue));
        return trainingRepository.save(training);
    }

    /**
     * Calls the training off. The row and the attendance snapshot stay.
     * reason may be empty.
     */
    @Transactional
    public Training cancelTraining(Long id, String reason) {
        Training training = getById(id);
        training.setStatus(TrainingStatus.CANCELLED);
        training.setCancelReason(blankToNull(reason));
        return trainingRepository.save(training);
    }

    /**
     * Undoes a cancel: SCHEDULED again and the reason is cleared, so attendance can be marked.
     * Calling it on a training that is not cancelled changes nothing (idempotent, 200).
     */
    @Transactional
    public Training reactivateTraining(Long id) {
        Training training = getById(id);
        training.setStatus(TrainingStatus.SCHEDULED);
        training.setCancelReason(null);
        return trainingRepository.save(training);
    }

    public List<TrainingAttendance> listAttendance(Long trainingId) {
        Training training = getById(trainingId);
        return attendanceRepository.findByTrainingId(training.getId());
    }

    @Transactional
    public TrainingAttendance updateAttendance(Long trainingId, Long playerUserId, String statusName) {
        Training training = getById(trainingId);
        if (training.statusOrScheduled() == TrainingStatus.CANCELLED) {
            throw new BadRequestException("This training is cancelled");
        }

        if (statusName == null || statusName.isBlank()) {
            throw new BadRequestException("status is required (PRESENT, ABSENT, or EXCUSED)");
        }

        AttendanceStatus status;
        try {
            status = AttendanceStatus.valueOf(statusName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("status must be PRESENT, ABSENT, or EXCUSED");
        }

        TrainingAttendance row = attendanceRepository
                .findByTrainingIdAndPlayerUserId(training.getId(), playerUserId)
                .orElseThrow(() -> new BadRequestException(
                        "This player is not on the attendance list for this training"));

        row.setStatus(status);
        return attendanceRepository.save(row);
    }

    public String getTeamName(Long teamId) {
        return teamService.getTeamName(teamId);
    }

    public AppUser getPlayer(Long playerUserId) {
        return userRepository.findById(playerUserId)
                .orElseThrow(() -> new NotFoundException("Player not found"));
    }

    /**
     * ADMIN and CHAIRMAN may manage trainings on every team.
     * A coach may manage only a team they are linked to.
     * The link is a row in team_coaches. The role alone is not enough for a coach,
     * and a chairman does not need that row.
     */
    private void assertCanManageTeam(Long teamId) {
        ClubRole role = currentClubRole();
        if (role != null && role.canManageAllTrainings()) {
            return;
        }
        if (role == ClubRole.COACH && isCoachOfTeam(teamId)) {
            return;
        }
        throw new AccessDeniedException(
                "Only ADMIN, CHAIRMAN, or a coach of this team can manage trainings");
    }

    private boolean isCoachOfTeam(Long teamId) {
        if (teamId == null) {
            return false;
        }
        return teamCoachRepository.existsByTeamIdAndUserId(teamId, currentUserId());
    }

    /**
     * The token carries one club role (ADR 0006). Spring stores it as ROLE_NAME.
     * An unknown name is ignored so a bad token is not treated as a chairman.
     */
    private ClubRole currentClubRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return null;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            ClubRole role = clubRoleFromAuthority(authority.getAuthority());
            if (role != null) {
                return role;
            }
        }
        return null;
    }

    private ClubRole clubRoleFromAuthority(String authority) {
        if (authority == null || !authority.startsWith("ROLE_")) {
            return null;
        }
        String roleName = authority.substring("ROLE_".length());
        try {
            return ClubRole.valueOf(roleName);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new AccessDeniedException("Not logged in");
        }
        return id;
    }

    private String resolvedTitle(String title) {
        return (title == null || title.isBlank()) ? "Training" : title.trim();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
