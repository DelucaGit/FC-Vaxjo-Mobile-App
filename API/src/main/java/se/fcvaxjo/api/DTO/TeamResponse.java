package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TeamResponse {
    private final Long id;
    private final String name;
}
