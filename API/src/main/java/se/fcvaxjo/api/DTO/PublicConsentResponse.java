package se.fcvaxjo.api.DTO;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

/**
 * Whether a player's name and shirt number may be shown on the public site.
 * No email and no phone. publicConsentAt is null when consent is off.
 */
@Getter
@Setter
@AllArgsConstructor
public class PublicConsentResponse {
    private Long userId;
    private boolean publicConsent;
    private Instant publicConsentAt;
}
