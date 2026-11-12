package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

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
import se.fcvaxjo.api.model.TrainingType;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

@Service
public class TrainingService {

    /** Most trainings one series call may create (issue #129). More gives 400. */
    static final int MAX_SERIES_TRAININGS = 60;

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final TeamService teamService;
    private final TeamCoachRepository teamCoachRepository;
    private final UserRepository userRepository;
    private final TrainingAttendanceRoster roster;
    private final Clock clock;
    private final ActivityStartRule startRule;

    public TrainingService(
            TrainingRepository trainingRepository,
            TrainingAttendanceRepository attendanceRepository,
            TeamService teamService,
            TeamCoachRepository teamCoachRepository,
            UserRepository userRepository,
            TrainingAttendanceRoster roster,
            Clock clock,
            ActivityStartRule startRule) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.teamService = teamService;
        this.teamCoachRepository = teamCoachRepository;
        this.userRepository = userRepository;
        this.roster = roster;
        this.clock = clock;
        this.startRule = startRule;
    }

    public Training createTraining(Long teamId, LocalDateTime startsAt, LocalDateTime endsAt, String type) {
        return createTraining(teamId, startsAt, endsAt, type, null);
    }

    /**
     * Creates a training. No attendance rows are copied: while the training is open,
     * the list follows the team's current players (issue #86).
     */
    @Transactional
    public Training createTraining(
            Long teamId, LocalDateTime startsAt, LocalDateTime endsAt, String type, String venue) {
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
        startRule.assertNotInPast(currentClubRole(), startsAt);

        teamService.getTeamById(teamId);

        TrainingType resolvedType = TrainingType.fromRequest(type);

        Training training = new Training();
        training.setTeamId(teamId);
        training.setStartsAt(startsAt);
        training.setEndsAt(endsAt);
        setType(training, resolvedType);
        training.setVenue(blankToNull(venue));
        training.setStatus(TrainingStatus.SCHEDULED);
        training.setCreatedByUserId(currentUserId());
        return trainingRepository.save(training);
    }

    /**
     * Creates one ordinary training for each date from fromDate to toDate (inclusive)
     * whose weekday is in weekdays (issue #129). No series row is stored.
     * Dates whose start time has already passed are skipped, for every role.
     * One transaction: if any training fails, none are saved.
     */
    @Transactional
    public List<Training> createTrainingSeries(
            Long teamId,
            String type,
            List<String> weekdays,
            LocalTime startTime,
            LocalTime endTime,
            String venue,
            LocalDate fromDate,
            LocalDate toDate) {
        assertCanManageTeam(teamId);

        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        if (fromDate == null || toDate == null) {
            throw new BadRequestException("fromDate and toDate are required");
        }
        if (toDate.isBefore(fromDate)) {
            throw new BadRequestException("toDate must not be before fromDate");
        }
        if (startTime == null || endTime == null) {
            throw new BadRequestException("startTime and endTime are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("endTime must be after startTime");
        }
        Set<DayOfWeek> days = parseWeekdays(weekdays);
        TrainingType.fromRequest(type);
        teamService.getTeamById(teamId);

        List<LocalDateTime> starts = new ArrayList<>();
        for (LocalDate date = fromDate; !date.isAfter(toDate); date = date.plusDays(1)) {
            if (!days.contains(date.getDayOfWeek())) {
                continue;
            }
            LocalDateTime startsAt = date.atTime(startTime);
            if (startRule.isInPast(startsAt)) {
                continue;
            }
            starts.add(startsAt);
            if (starts.size() > MAX_SERIES_TRAININGS) {
                throw new BadRequestException(
                        "A series may create at most " + MAX_SERIES_TRAININGS + " trainings");
            }
        }

        // Same code path as a single training, so the rules stay in one place.
        List<Training> created = new ArrayList<>();
        for (LocalDateTime startsAt : starts) {
            LocalDateTime endsAt = startsAt.toLocalDate().atTime(endTime);
            created.add(createTraining(teamId, startsAt, endsAt, type, venue));
        }
        return created;
    }

    private Set<DayOfWeek> parseWeekdays(List<String> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) {
            throw new BadRequestException("weekdays must contain at least one day");
        }
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        for (String name : weekdays) {
            try {
                days.add(DayOfWeek.valueOf(name == null ? "" : name.trim()));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Unknown weekday. Use MONDAY to SUNDAY");
            }
        }
        return days;
    }

    public List<Training> listByTeam(Long teamId) {
        return listByTeam(teamId, null);
    }

    /**
     * @param when null lists everything, otherwise only upcoming or past (issue #116).
     *             The team check runs first, so the filter can only narrow the list.
     */
    public List<Training> listByTeam(Long teamId, ActivityWhen when) {
        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        assertCanManageTeam(teamId);
        teamService.getTeamById(teamId);
        List<Training> trainings = new ArrayList<>();
        for (Training training : trainingRepository.listForTeam(teamId, when, clock)) {
            trainings.add(roster.freezeIfDue(training));
        }
        return trainings;
    }

    public Training getById(Long id) {
        Training training = trainingRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Training not found"));
        assertCanManageTeam(training.getTeamId());
        return roster.freezeIfDue(training);
    }

    /**
     * Changes time, place, and training type. The team stays, so the attendance rows stay.
     * A frozen list stays frozen even if the time moves.
     * A cancelled training can still be corrected. Marking attendance stays blocked.
     * A new start time may not be in the past, except for ADMIN (issue #115).
     */
    @Transactional
    public Training updateTraining(
            Long id, LocalDateTime startsAt, LocalDateTime endsAt, String type, String venue) {
        Training training = getById(id);
        if (startsAt == null || endsAt == null) {
            throw new BadRequestException("startsAt and endsAt are required");
        }
        if (!endsAt.isAfter(startsAt)) {
            throw new BadRequestException("endsAt must be after startsAt");
        }
        // Only a new start time is checked. Fixing the place on an old training still works.
        if (!startsAt.equals(training.getStartsAt())) {
            startRule.assertNotInPast(currentClubRole(), startsAt);
        }
        training.setStartsAt(startsAt);
        training.setEndsAt(endsAt);
        setType(training, TrainingType.fromRequest(type));
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

    /**
     * Open: the team's active players now, with saved status or null.
     * Frozen: only the saved rows (a player who has left stays, a new player is not shown).
     */
    @Transactional
    public List<TrainingAttendance> listAttendance(Long trainingId) {
        Training training = getById(trainingId);
        return roster.currentList(training);
    }

    /**
     * "Klar": freezes the attendance list. Calling it again changes nothing (200).
     * Every player on the live list must be marked first, otherwise 400.
     * A team with no players can be frozen right away (nobody to mark).
     */
    @Transactional
    public Training lockAttendance(Long trainingId) {
        Training training = getById(trainingId);
        if (training.statusOrScheduled() == TrainingStatus.CANCELLED) {
            throw new BadRequestException("This training is cancelled");
        }
        if (training.getAttendanceLockedAt() != null) {
            return training;
        }
        startRule.assertAttendanceOpen(training.getStartsAt());
        boolean someoneUnmarked = roster.currentList(training).stream()
                .anyMatch(row -> row.getStatus() == null);
        if (someoneUnmarked) {
            throw new BadRequestException(
                    "All players must be marked before the attendance list can be frozen");
        }
        return roster.freezeNow(training);
    }

    @Transactional
    public TrainingAttendance updateAttendance(Long trainingId, Long playerUserId, String statusName) {
        Training training = getById(trainingId);
        if (training.statusOrScheduled() == TrainingStatus.CANCELLED) {
            throw new BadRequestException("This training is cancelled");
        }
        if (training.getAttendanceLockedAt() != null) {
            throw new BadRequestException(
                    "The attendance list for this training is frozen and can no longer be changed");
        }
        startRule.assertAttendanceOpen(training.getStartsAt());

        if (statusName == null || statusName.isBlank()) {
            throw new BadRequestException("status is required (PRESENT, ABSENT, or EXCUSED)");
        }

        AttendanceStatus status;
        try {
            status = AttendanceStatus.valueOf(statusName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("status must be PRESENT, ABSENT, or EXCUSED");
        }

        if (!roster.isLivePlayer(training.getTeamId(), playerUserId)) {
            throw new BadRequestException(
                    "This player is not on the attendance list for this training");
        }
        TrainingAttendance row = attendanceRepository
                .findByTrainingIdAndPlayerUserId(training.getId(), playerUserId)
                .orElseGet(() -> {
                    TrainingAttendance created = new TrainingAttendance();
                    created.setTrainingId(training.getId());
                    created.setPlayerUserId(playerUserId);
                    return created;
                });

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

    /**
     * Sets the type. The old title column is NOT NULL, so it gets the Swedish name.
     * Nothing reads the title any more (issue #118).
     */
    private void setType(Training training, TrainingType type) {
        training.setType(type);
        training.setTitle(type.swedishName());
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
