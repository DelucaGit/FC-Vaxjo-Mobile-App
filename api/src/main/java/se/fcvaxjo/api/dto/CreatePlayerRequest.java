package se.fcvaxjo.api.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

/**
 * Body for POST /api/players.
 * teamId and parentIds are optional on create.
 */
public record CreatePlayerRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        String dateOfBirth,
        Integer jerseyNumber,
        Long teamId,
        Long userId,
        List<Long> parentIds
) {
}
