package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/**
 * Body for POST /api/saved-venues. name is required; address is optional.
 * Both are trimmed, and a blank address is stored as null.
 */
@Getter
@Setter
public class CreateSavedVenueRequest {
    private String name;
    private String address;
}
