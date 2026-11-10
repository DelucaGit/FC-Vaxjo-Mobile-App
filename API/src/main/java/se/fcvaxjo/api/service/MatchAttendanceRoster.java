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
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.MatchAttendance;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.MatchAttendanceRepository;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Decides who is on a match's attendance list (issue #67, same rule as trainings in ADR 0010).
 *
 * Open match: the active players on the team right now, with their saved status.
 * Frozen match: exactly the saved rows, nothing else.
 *
 * This is a close copy of TrainingAttendanceRoster. The two differ in the entity types
 * and in when the auto-freeze happens (a match has no end time). A shared generic class
 * would save a few lines but be harder to read, so they stay separate.
 *
 * This class does no access checks. MatchService has already checked who may see or
 * change the match.
 */
@Service
public class MatchAttendanceRoster {

    /**
     * An open match freezes by itself this long after kickoff.
     * A match has no end time, so this is about 2 hours of match plus the 6 hours
     * a training gets after it ends.
     */
    public static final long AUTO_FREEZE_HOURS_AFTER_KICKOFF = 8;

    /** Kickoff times are club wall-clock times in Sweden, stored without a zone. */
    static final ZoneId CLUB_ZONE = ZoneId.of("Europe/Stockholm");

    private final MatchRepository matchRepository;
    private final MatchAttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final Clock clock;

    public MatchAttendanceRoster(
            MatchRepository matchRepository,
            MatchAttendanceRepository attendanceRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            Clock clock) {
        this.matchRepository = matchRepository;
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.clock = clock;
    }

    /**
     * Lazy auto-freeze. Call this before reading or changing a match.
     * An open match whose kickoff was more than 8 hours ago is frozen with the rows
     * it already has. Nothing is added: "now" may be days later, and today's team
     * is not the team that played.
     */
    @Transactional
    public Match freezeIfDue(Match match) {
        if (match.getAttendanceLockedAt() != null) {
            return match;
        }
        LocalDateTime now = now();
        if (!now.isAfter(match.getKickoffAt().plusHours(AUTO_FREEZE_HOURS_AFTER_KICKOFF))) {
            return match;
        }
        match.setAttendanceLockedAt(now);
        return matchRepository.save(match);
    }

    /**
     * "Klar": saves one row per player on the live list, removes rows for players
     * who are no longer on the list, and freezes the match.
     * MatchService only calls this when every live player is marked, so the save
     * below is a safety net, not the normal path.
     */
    @Transactional
    public Match freezeNow(Match match) {
        Set<Long> keep = new HashSet<>();
        for (MatchAttendance row : currentList(match)) {
            keep.add(row.getPlayerUserId());
            if (row.getId() == null) {
                attendanceRepository.save(row);
            }
        }
        for (MatchAttendance saved : attendanceRepository.findByMatchId(match.getId())) {
            if (!keep.contains(saved.getPlayerUserId())) {
                attendanceRepository.delete(saved);
            }
        }
        match.setAttendanceLockedAt(now());
        return matchRepository.save(match);
    }

    /**
     * The list to show. Rows without an id are players who are on the live list
     * but have not been marked yet (status null). They are not saved here.
     */
    public List<MatchAttendance> currentList(Match match) {
        List<MatchAttendance> saved = attendanceRepository.findByMatchId(match.getId());
        if (match.getAttendanceLockedAt() != null) {
            return saved;
        }
        Map<Long, MatchAttendance> savedByPlayer = saved.stream()
                .collect(Collectors.toMap(MatchAttendance::getPlayerUserId, Function.identity()));
        List<MatchAttendance> list = new ArrayList<>();
        for (AppUser player : livePlayers(match.getTeamId())) {
            MatchAttendance row = savedByPlayer.get(player.getId());
            if (row == null) {
                row = new MatchAttendance();
                row.setMatchId(match.getId());
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
