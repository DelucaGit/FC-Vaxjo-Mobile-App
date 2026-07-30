package se.fcvaxjo.api.controllers;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.dto.CreatePlayerRequest;
import se.fcvaxjo.api.dto.PlayerResponse;
import se.fcvaxjo.api.services.PlayerService;

/**
 * HTTP endpoints for players, parents, and team assignment.
 */
@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlayerResponse create(@Valid @RequestBody CreatePlayerRequest request) {
        return playerService.create(request);
    }

    /**
     * List all players, or filter with ?teamId=1
     */
    @GetMapping
    public List<PlayerResponse> list(@RequestParam(required = false) Long teamId) {
        if (teamId != null) {
            return playerService.findByTeamId(teamId);
        }
        return playerService.findAll();
    }

    @GetMapping("/{id}")
    public PlayerResponse getById(@PathVariable Long id) {
        return playerService.findById(id);
    }

    /** Link a parent user to this player. */
    @PostMapping("/{playerId}/parents/{parentUserId}")
    public PlayerResponse addParent(
            @PathVariable Long playerId,
            @PathVariable Long parentUserId
    ) {
        return playerService.addParent(playerId, parentUserId);
    }

    /** Move / assign a player to a team. */
    @PutMapping("/{playerId}/team/{teamId}")
    public PlayerResponse assignTeam(
            @PathVariable Long playerId,
            @PathVariable Long teamId
    ) {
        return playerService.assignTeam(playerId, teamId);
    }
}
