package se.fcvaxjo.api.dto;

import java.util.List;

import se.fcvaxjo.api.models.Player;

/**
 * Player data returned by the API.
 */
public record PlayerResponse(
        Long id,
        String firstName,
        String lastName,
        String dateOfBirth,
        Integer jerseyNumber,
        Long teamId,
        String teamName,
        Long userId,
        List<UserResponse> parents
) {
    public static PlayerResponse from(Player player) {
        Long teamId = player.getTeam() != null ? player.getTeam().getId() : null;
        String teamName = player.getTeam() != null ? player.getTeam().getName() : null;
        Long userId = player.getUser() != null ? player.getUser().getId() : null;

        List<UserResponse> parents = player.getParents().stream()
                .map(UserResponse::from)
                .toList();

        return new PlayerResponse(
                player.getId(),
                player.getFirstName(),
                player.getLastName(),
                player.getDateOfBirth(),
                player.getJerseyNumber(),
                teamId,
                teamName,
                userId,
                parents
        );
    }
}
