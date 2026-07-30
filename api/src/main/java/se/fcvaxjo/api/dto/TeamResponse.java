package se.fcvaxjo.api.dto;

import java.util.List;

import se.fcvaxjo.api.models.Team;

/**
 * Team data returned by the API, including coach summaries.
 */
public record TeamResponse(
        Long id,
        String name,
        String ageGroup,
        String season,
        List<UserResponse> coaches
) {
    public static TeamResponse from(Team team) {
        List<UserResponse> coaches = team.getCoaches().stream()
                .map(UserResponse::from)
                .toList();

        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getAgeGroup(),
                team.getSeason(),
                coaches
        );
    }
}
