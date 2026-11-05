package se.fcvaxjo.api.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.AddCoachRequest;
import se.fcvaxjo.api.DTO.CreateTeamRequest;
import se.fcvaxjo.api.DTO.FetchUserResponse;
import se.fcvaxjo.api.DTO.TeamResponse;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.service.TeamService;
import se.fcvaxjo.api.service.UserService;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;
    private final UserService userService;

    public TeamController(TeamService teamService, UserService userService) {
        this.teamService = teamService;
        this.userService = userService;
    }

    // Same rule as ClubRole.canCreateTeam: the chairman creates teams. A coach does not (ADR 0006).
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN')")
    public ResponseEntity<TeamResponse> createTeam(@RequestBody CreateTeamRequest request) {
        Team team = teamService.createTeam(request.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new TeamResponse(team.getId(), team.getName()));
    }

    @GetMapping
    public List<TeamResponse> getAllTeams() {
        List<TeamResponse> responses = new ArrayList<>();
        for (Team team : teamService.getAllTeams()) {
            responses.add(new TeamResponse(team.getId(), team.getName()));
        }
        return responses;
    }

    @GetMapping("/{id}")
    public TeamResponse getTeamById(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        return new TeamResponse(team.getId(), team.getName());
    }

    // Same rule as ClubRole.canLinkCoach. The chairman links a coach on any team.
    // There is no team filter: ADMIN and CHAIRMAN are not limited to one team (ADR 0006).
    @PostMapping("/{id}/coaches")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN')")
    public ResponseEntity<FetchUserResponse> addCoach(
            @PathVariable Long id,
            @RequestBody AddCoachRequest request) {
        TeamCoach link = teamService.addCoach(id, request.getUserId());
        AppUser coach = userService.getUserById(link.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toFetchResponse(coach));
    }

    /**
     * Coach email and phone. A player must not collect the staff contact list here.
     * The chairman may read every team. We do not check team_coaches for this call.
     */
    @GetMapping("/{id}/coaches")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<FetchUserResponse> listCoaches(@PathVariable Long id) {
        List<FetchUserResponse> responses = new ArrayList<>();
        for (AppUser coach : teamService.listCoaches(id)) {
            responses.add(toFetchResponse(coach));
        }
        return responses;
    }

    /**
     * Each player, plus the parent's name, email and phone.
     * That parent phone is why a child must not call this for any team.
     * The chairman may, including teams they are not linked to.
     */
    @GetMapping("/{id}/players")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<FetchUserResponse> listPlayers(@PathVariable Long id) {
        List<FetchUserResponse> responses = new ArrayList<>();
        for (AppUser player : teamService.listPlayers(id)) {
            responses.add(toFetchResponse(player));
        }
        return responses;
    }

    // Same rule as addCoach: only ADMIN and CHAIRMAN, and they may do it on any team.
    @DeleteMapping("/{id}/coaches/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN')")
    public ResponseEntity<Void> removeCoach(
            @PathVariable Long id,
            @PathVariable Long userId) {
        teamService.removeCoach(id, userId);
        return ResponseEntity.noContent().build();
    }

    private FetchUserResponse toFetchResponse(AppUser user) {
        return new FetchUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                userService.getRoleName(user.getRoleId()),
                user.getPlayerNumber(),
                user.getMobilePhoneNumber(),
                user.getParentId(),
                userService.getParentName(user.getParentId()),
                userService.getParentEmail(user.getParentId()),
                userService.getParentMobilePhoneNumber(user.getParentId()),
                user.getTeamId(),
                teamService.getTeamName(user.getTeamId()),
                user.isActive());
    }
}
