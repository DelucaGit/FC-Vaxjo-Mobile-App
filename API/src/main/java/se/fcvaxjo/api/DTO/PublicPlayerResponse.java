package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * One player on the public squad.
 * Name and shirt number only, and only after the parent has consented.
 * No id, no email, no phone, no parent.
 */
@Getter
@Setter
@AllArgsConstructor
public class PublicPlayerResponse {
    private String name;
    private Integer playerNumber;
}
