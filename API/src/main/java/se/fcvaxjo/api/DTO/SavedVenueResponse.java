package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/** One saved venue in the club's shared list. */
@Getter
@Setter
@AllArgsConstructor
public class SavedVenueResponse {
    private Long id;
    private String name;
    private String address;
    private Long createdByUserId;
}
