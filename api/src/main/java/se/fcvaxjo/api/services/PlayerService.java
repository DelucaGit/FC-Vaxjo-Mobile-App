package se.fcvaxjo.api.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import se.fcvaxjo.api.dto.CreatePlayerRequest;
import se.fcvaxjo.api.dto.PlayerResponse;
import se.fcvaxjo.api.models.Player;
import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.User;
import se.fcvaxjo.api.repositories.PlayerRepository;

/**
 * Business logic for players, teams, and parents.
 *
 * @Transactional keeps the database session open while we read parents/team.
 */
@Service
@Transactional(readOnly = true)
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final UserService userService;
    private final TeamService teamService;

    public PlayerService(
            PlayerRepository playerRepository,
            UserService userService,
            TeamService teamService
    ) {
        this.playerRepository = playerRepository;
        this.userService = userService;
        this.teamService = teamService;
    }

    @Transactional
    public PlayerResponse create(CreatePlayerRequest request) {
        Player player = new Player();
        player.setFirstName(request.firstName());
        player.setLastName(request.lastName());
        player.setDateOfBirth(request.dateOfBirth());
        player.setJerseyNumber(request.jerseyNumber());

        if (request.teamId() != null) {
            player.setTeam(teamService.getTeamOrThrow(request.teamId()));
        }

        if (request.userId() != null) {
            User user = userService.getUserOrThrow(request.userId());
            player.setUser(user);
        }

        if (request.parentIds() != null) {
            List<User> parents = new ArrayList<>();
            for (Long parentId : request.parentIds()) {
                parents.add(requireParent(parentId));
            }
            player.setParents(parents);
        }

        Player saved = playerRepository.save(player);
        return PlayerResponse.from(saved);
    }

    public List<PlayerResponse> findAll() {
        return playerRepository.findAll().stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public List<PlayerResponse> findByTeamId(Long teamId) {
        // Make sure the team exists first (clear 404 if not).
        teamService.getTeamOrThrow(teamId);

        return playerRepository.findByTeamId(teamId).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public PlayerResponse findById(Long id) {
        return PlayerResponse.from(getPlayerOrThrow(id));
    }

    @Transactional
    public PlayerResponse addParent(Long playerId, Long parentUserId) {
        Player player = getPlayerOrThrow(playerId);
        User parent = requireParent(parentUserId);

        boolean alreadyLinked = player.getParents().stream()
                .anyMatch(existing -> existing.getId().equals(parent.getId()));

        if (!alreadyLinked) {
            player.getParents().add(parent);
            playerRepository.save(player);
        }

        return PlayerResponse.from(player);
    }

    @Transactional
    public PlayerResponse assignTeam(Long playerId, Long teamId) {
        Player player = getPlayerOrThrow(playerId);
        player.setTeam(teamService.getTeamOrThrow(teamId));
        Player saved = playerRepository.save(player);
        return PlayerResponse.from(saved);
    }

    private User requireParent(Long parentUserId) {
        User parent = userService.getUserOrThrow(parentUserId);
        if (parent.getRole() != Role.PARENT && parent.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "User must have role PARENT or ADMIN to be linked as parent"
            );
        }
        return parent;
    }

    private Player getPlayerOrThrow(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Player not found: " + id));
    }
}
