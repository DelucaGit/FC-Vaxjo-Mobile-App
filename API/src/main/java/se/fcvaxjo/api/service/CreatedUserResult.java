package se.fcvaxjo.api.service;

import se.fcvaxjo.api.model.AppUser;

/**
 * Create-user result: the saved user plus plain temporary password(s)
 * shown once to the coach/admin. Hashes are stored; plain text is not.
 */
public class CreatedUserResult {

    private final AppUser user;
    private final String temporaryPassword;
    private final String parentTemporaryPassword;

    public CreatedUserResult(AppUser user, String temporaryPassword, String parentTemporaryPassword) {
        this.user = user;
        this.temporaryPassword = temporaryPassword;
        this.parentTemporaryPassword = parentTemporaryPassword;
    }

    public AppUser getUser() {
        return user;
    }

    public String getTemporaryPassword() {
        return temporaryPassword;
    }

    public String getParentTemporaryPassword() {
        return parentTemporaryPassword;
    }
}
