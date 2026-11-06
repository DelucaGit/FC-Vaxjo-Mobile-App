package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for POST /api/users/search.
 * Exactly one of the three fields must be set. The values stay out of the URL
 * so an access log does not store a name, a shirt number, or a phone (F1, ADR 0004).
 */
@Getter
@Setter
public class SearchUsersRequest {
    private String name;
    private Integer playerNumber;
    private String phone;
}
