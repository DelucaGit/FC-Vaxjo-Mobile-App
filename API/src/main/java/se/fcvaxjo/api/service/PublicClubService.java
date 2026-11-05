package se.fcvaxjo.api.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Read-only data for the public website. No login.
 * A squad row is only an active player whose parent has consented,
 * and only the name and the shirt number. Inactive users are left out.
 * If the parent is inactive, the child is left out too, because that
 * parent can no longer revoke the consent.
 */
@Service
public class PublicClubService {

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public PublicClubService(
            TeamRepository teamRepository,
            TeamService teamService,
            MatchRepository matchRepository,
            UserRepository userRepository,
            UserService userService) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    /**
     * Every team row. Team has no active flag, so the list is the whole table.
     */
    public List<Team> listTeams() {
        return teamRepository.findAll();
    }

    /** Kickoff now or later. Earliest first. A teamId that is missing is 404. */
    public List<Match> upcomingMatches(Long teamId) {
        requireTeamIfAsked(teamId);
        LocalDateTime now = LocalDateTime.now();
        if (teamId == null) {
            return matchRepository.findByKickoffAtGreaterThanEqualOrderByKickoffAtAsc(now);
        }
        return matchRepository.findByTeamIdAndKickoffAtGreaterThanEqualOrderByKickoffAtAsc(teamId, now);
    }

    /**
     * Kickoff before now. Latest first.
     * A played match with no score yet is still history. The score field stays null.
     */
    public List<Match> matchHistory(Long teamId) {
        requireTeamIfAsked(teamId);
        LocalDateTime now = LocalDateTime.now();
        if (teamId == null) {
            return matchRepository.findByKickoffAtBeforeOrderByKickoffAtDesc(now);
        }
        return matchRepository.findByTeamIdAndKickoffAtBeforeOrderByKickoffAtDesc(teamId, now);
    }

    /**
     * Name and shirt number for players the parent has published.
     * Everyone else is skipped. The caller cannot tell who was skipped.
     */
    public List<AppUser> publicSquad(Long teamId) {
        teamService.getTeamById(teamId);
        List<AppUser> visible = new ArrayList<>();
        for (AppUser player : userRepository.findByTeamIdAndActiveTrue(teamId)) {
            if (mayShowPlayer(player)) {
                visible.add(player);
            }
        }
        return visible;
    }

    public String getTeamName(Long teamId) {
        return teamService.getTeamName(teamId);
    }

    private boolean mayShowPlayer(AppUser player) {
        if (player.getPublicConsentAt() == null) {
            return false;
        }
        if (!player.isActive()) {
            return false;
        }
        if (!"PLAYER".equals(userService.getRoleName(player.getRoleId()))) {
            return false;
        }
        if (player.getParentId() == null) {
            return false;
        }
        AppUser parent = userRepository.findById(player.getParentId()).orElse(null);
        return parent != null && parent.isActive();
    }

    private void requireTeamIfAsked(Long teamId) {
        if (teamId != null) {
            teamService.getTeamById(teamId);
        }
    }
}
