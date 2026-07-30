package se.fcvaxjo.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Body for POST /api/teams.
 */
public record CreateTeamRequest(
        @NotBlank String name,
        String ageGroup,
        String season
) {
}
