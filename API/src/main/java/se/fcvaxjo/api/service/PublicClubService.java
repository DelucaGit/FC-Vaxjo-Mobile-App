package se.fcvaxjo.api.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TeamRepository;

/**
 * Read-only data for the public website. No login.
 * Teams and matches only. No player data is ever public (ADR 0007).
 */
@Service
public class PublicClubService {

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final MatchRepository matchRepository;

    public PublicClubService(
            TeamRepository teamRepository,
            TeamService teamService,
            MatchRepository matchRepository) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.matchRepository = matchRepository;
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

    public String getTeamName(Long teamId) {
        return teamService.getTeamName(teamId);
    }

    private void requireTeamIfAsked(Long teamId) {
        if (teamId != null) {
            teamService.getTeamById(teamId);
        }
    }
}
