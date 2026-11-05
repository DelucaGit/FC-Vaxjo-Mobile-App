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
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
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

    /**
     * Creates a training and snapshots current active players on the team
     * into attendance rows (status null until marked).
     */
    @Transactional
    public Training createTraining(Long teamId, LocalDateTime startsAt, LocalDateTime endsAt, String title) {
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

        String resolvedTitle = (title == null || title.isBlank()) ? "Training" : title.trim();

        Training training = new Training();
        training.setTeamId(teamId);
        training.setStartsAt(startsAt);
        training.setEndsAt(endsAt);
        training.setTitle(resolvedTitle);
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

    public List<TrainingAttendance> listAttendance(Long trainingId) {
        Training training = getById(trainingId);
        return attendanceRepository.findByTrainingId(training.getId());
    }

    @Transactional
    public TrainingAttendance updateAttendance(Long trainingId, Long playerUserId, String statusName) {
        Training training = getById(trainingId);

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
     * ADMIN may manage any team. COACH only teams they are linked to.
     */
    private void assertCanManageTeam(Long teamId) {
        if (hasRole("ADMIN")) {
            return;
        }
        if (hasRole("COACH") && teamId != null
                && teamCoachRepository.existsByTeamIdAndUserId(teamId, currentUserId())) {
            return;
        }
        throw new AccessDeniedException("Only ADMIN or a coach of this team can manage trainings");
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
