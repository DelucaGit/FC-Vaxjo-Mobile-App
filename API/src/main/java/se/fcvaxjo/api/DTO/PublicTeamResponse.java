package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/** Public team. Id and name only. No people. */
@Getter
@Setter
@AllArgsConstructor
public class PublicTeamResponse {
    private Long id;
    private String name;
}
