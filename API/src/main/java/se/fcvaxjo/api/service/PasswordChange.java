package se.fcvaxjo.api.service;

import java.time.Instant;

import se.fcvaxjo.api.model.AppUser;

/**
 * The only way production code stores a new password hash.
 *
 * Every write sets {@code passwordChangedAt} to now. The filter rejects a
 * token whose {@code iat} second is earlier than that time. The check is a
 * strict {@code >} on whole seconds (S1-9), so a token from the same second
 * still works. That keeps the first login after this save from failing.
 */
public final class PasswordChange {

    private PasswordChange() {
    }

    public static void storeHash(AppUser user, String hash) {
        user.setPasswordHash(hash);
        user.setPasswordChangedAt(Instant.now());
    }
}
