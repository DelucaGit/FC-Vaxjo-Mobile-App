package se.fcvaxjo.api.DTO;

import lombok.Getter;
import lombok.Setter;

/** Body for granting or revoking public consent. true publishes, false removes it. */
@Getter
@Setter
public class PublicConsentRequest {
    private Boolean publicConsent;
}
