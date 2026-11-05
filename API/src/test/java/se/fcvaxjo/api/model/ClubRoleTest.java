package se.fcvaxjo.api.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ClubRoleTest {

    @Test
    void hierarchyIsAdminThenChairmanThenCoachThenEqualPlayerAndParent() {
        assertTrue(ClubRole.ADMIN.outranks(ClubRole.CHAIRMAN));
        assertTrue(ClubRole.CHAIRMAN.outranks(ClubRole.COACH));
        assertTrue(ClubRole.COACH.outranks(ClubRole.PLAYER));
        assertTrue(ClubRole.COACH.outranks(ClubRole.PARENT));

        assertEquals(ClubRole.PLAYER.rank(), ClubRole.PARENT.rank());
        assertFalse(ClubRole.PLAYER.outranks(ClubRole.PARENT));
        assertFalse(ClubRole.PARENT.outranks(ClubRole.PLAYER));
        assertFalse(ClubRole.ADMIN.outranks(ClubRole.ADMIN));
    }

    @Test
    void onlyAdminAndChairmanCanCreateTeams() {
        assertTrue(ClubRole.ADMIN.canCreateTeam());
        assertTrue(ClubRole.CHAIRMAN.canCreateTeam());
        assertFalse(ClubRole.COACH.canCreateTeam());
        assertFalse(ClubRole.PLAYER.canCreateTeam());
        assertFalse(ClubRole.PARENT.canCreateTeam());
    }
}
