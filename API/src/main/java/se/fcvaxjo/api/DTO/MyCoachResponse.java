package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * A coach as a player or parent sees them in GET /api/my/coaches.
 * Only what is needed to get in touch: no role, no team list, no other personal data.
 */
@Getter
@Setter
@AllArgsConstructor
public class MyCoachResponse {
    private Long id;
    private String name;
    private String email;
    private String mobilePhoneNumber;
}
