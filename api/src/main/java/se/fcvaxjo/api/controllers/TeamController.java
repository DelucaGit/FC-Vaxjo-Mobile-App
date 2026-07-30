package se.fcvaxjo.api.controllers;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.dto.CreateTeamRequest;
import se.fcvaxjo.api.dto.TeamResponse;
import se.fcvaxjo.api.services.TeamService;

/**
 * HTTP endpoints for teams and coach assignment.
 */
@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(@Valid @RequestBody CreateTeamRequest request) {
        return teamService.create(request);
    }

    @GetMapping
    public List<TeamResponse> list() {
        return teamService.findAll();
    }

    @GetMapping("/{id}")
    public TeamResponse getById(@PathVariable Long id) {
        return teamService.findById(id);
    }

    /** Link an existing coach user to this team. */
    @PostMapping("/{teamId}/coaches/{coachUserId}")
    public TeamResponse addCoach(
            @PathVariable Long teamId,
            @PathVariable Long coachUserId
    ) {
        return teamService.addCoach(teamId, coachUserId);
    }
}
