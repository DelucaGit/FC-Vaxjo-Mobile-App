package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.model.TrainingStatus;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Decides who is on a training's attendance list (issue #86).
 *
 * Open training: the active players on the team right now, with their saved status.
 * Frozen training: exactly the saved rows, nothing else.
 *
 * This class does no access checks. The caller (TrainingService, MyScheduleService)
 * has already checked who may see or change the training.
 */
@Service
public class TrainingAttendanceRoster {

    /** An open training freezes by itself this long after it ends. */
    public static final long AUTO_FREEZE_HOURS = 6;

    /** Training times are club wall-clock times in Sweden, stored without a zone. */
    static final ZoneId CLUB_ZONE = ZoneId.of("Europe/Stockholm");

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final Clock clock;

    public TrainingAttendanceRoster(
            TrainingRepository trainingRepository,
            TrainingAttendanceRepository attendanceRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            Clock clock) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.clock = clock;
    }

    /**
     * Lazy auto-freeze. Call this before reading or changing a training.
     * A training that is open, not cancelled, and ended more than 6 hours ago is frozen
     * with the rows it already has. Nothing is added or removed, because "now" may be
     * days after the training and today's team is not the team that trained.
     * This also covers old trainings whose rows were copied when they were created.
     */
    @Transactional
    public Training freezeIfDue(Training training) {
        if (training.getAttendanceLockedAt() != null) {
            return training;
        }
        if (training.statusOrScheduled() == TrainingStatus.CANCELLED) {
            return training;
        }
        LocalDateTime now = now();
        if (!now.isAfter(training.getEndsAt().plusHours(AUTO_FREEZE_HOURS))) {
            return training;
        }
        training.setAttendanceLockedAt(now);
        return trainingRepository.save(training);
    }

    /**
     * "Klar": saves one row per player on the live list, removes rows for players
     * who are no longer on the list, and freezes the training.
     * TrainingService only calls this when every live player is marked, so in practice
     * all rows already exist. The save below is a safety net, not the normal path.
     */
    @Transactional
    public Training freezeNow(Training training) {
        List<TrainingAttendance> list = currentList(training);
        Set<Long> keep = new HashSet<>();
        for (TrainingAttendance row : list) {
            keep.add(row.getPlayerUserId());
            if (row.getId() == null) {
                attendanceRepository.save(row);
            }
        }
        for (TrainingAttendance saved : attendanceRepository.findByTrainingId(training.getId())) {
            if (!keep.contains(saved.getPlayerUserId())) {
                attendanceRepository.delete(saved);
            }
        }
        training.setAttendanceLockedAt(now());
        return trainingRepository.save(training);
    }

    /**
     * The list to show. Rows without an id are players who are on the live list
     * but have not been marked yet (status null). They are not saved here.
     */
    public List<TrainingAttendance> currentList(Training training) {
        List<TrainingAttendance> saved = attendanceRepository.findByTrainingId(training.getId());
        if (training.getAttendanceLockedAt() != null) {
            return saved;
        }
        Map<Long, TrainingAttendance> savedByPlayer = saved.stream()
                .collect(Collectors.toMap(TrainingAttendance::getPlayerUserId, Function.identity()));
        List<TrainingAttendance> list = new ArrayList<>();
        for (AppUser player : livePlayers(training.getTeamId())) {
            TrainingAttendance row = savedByPlayer.get(player.getId());
            if (row == null) {
                row = new TrainingAttendance();
                row.setTrainingId(training.getId());
                row.setPlayerUserId(player.getId());
                row.setStatus(null);
            }
            list.add(row);
        }
        return list;
    }

    /** True when the user is an active PLAYER on this team right now. */
    public boolean isLivePlayer(Long teamId, Long userId) {
        if (userId == null) {
            return false;
        }
        for (AppUser player : livePlayers(teamId)) {
            if (userId.equals(player.getId())) {
                return true;
            }
        }
        return false;
    }

    /** Active users with role PLAYER whose team is this team. */
    private List<AppUser> livePlayers(Long teamId) {
        Long playerRoleId = roleRepository.findByName("PLAYER").map(Role::getId).orElse(null);
        if (playerRoleId == null) {
            return List.of();
        }
        List<AppUser> players = new ArrayList<>();
        for (AppUser user : userRepository.findByTeamIdAndActiveTrue(teamId)) {
            if (playerRoleId.equals(user.getRoleId())) {
                players.add(user);
            }
        }
        return players;
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), CLUB_ZONE);
    }
}
