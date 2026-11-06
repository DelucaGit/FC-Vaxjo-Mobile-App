package se.fcvaxjo.api.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.MatchResultResponse;
import se.fcvaxjo.api.DTO.PublicMatchResponse;
import se.fcvaxjo.api.DTO.PublicPlayerResponse;
import se.fcvaxjo.api.DTO.PublicTeamResponse;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.service.PublicClubService;

/**
 * Website reads. SecurityConfig permits GET /api/public/** and nothing else.
 * These methods do not take a token. They never return contact details.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final PublicClubService publicClubService;

    public PublicController(PublicClubService publicClubService) {
        this.publicClubService = publicClubService;
    }

    @GetMapping("/teams")
    public List<PublicTeamResponse> listTeams() {
        List<PublicTeamResponse> responses = new ArrayList<>();
        for (Team team : publicClubService.listTeams()) {
            responses.add(new PublicTeamResponse(team.getId(), team.getName()));
        }
        return responses;
    }

    @GetMapping("/teams/{id}/players")
    public List<PublicPlayerResponse> listSquad(@PathVariable Long id) {
        List<PublicPlayerResponse> responses = new ArrayList<>();
        for (AppUser player : publicClubService.publicSquad(id)) {
            responses.add(new PublicPlayerResponse(player.getName(), player.getPlayerNumber()));
        }
        return responses;
    }

    @GetMapping("/matches/upcoming")
    public List<PublicMatchResponse> upcoming(@RequestParam(required = false) Long teamId) {
        return toMatches(publicClubService.upcomingMatches(teamId));
    }

    @GetMapping("/matches/history")
    public List<PublicMatchResponse> history(@RequestParam(required = false) Long teamId) {
        return toMatches(publicClubService.matchHistory(teamId));
    }

    private List<PublicMatchResponse> toMatches(List<Match> matches) {
        List<PublicMatchResponse> responses = new ArrayList<>();
        for (Match match : matches) {
            responses.add(new PublicMatchResponse(
                    match.getId(),
                    match.getTeamId(),
                    publicClubService.getTeamName(match.getTeamId()),
                    match.getOpponent(),
                    match.getKickoffAt(),
                    match.getVenue(),
                    match.getHomeAway().name(),
                    resultOf(match)));
        }
        return responses;
    }

    private MatchResultResponse resultOf(Match match) {
        if (match.getGoalsFor() == null && match.getGoalsAgainst() == null) {
            return null;
        }
        return new MatchResultResponse(match.getGoalsFor(), match.getGoalsAgainst());
    }
}
