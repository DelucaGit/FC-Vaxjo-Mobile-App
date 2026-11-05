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

    @Test
    void onlyAdminAndChairmanCanLinkACoach() {
        assertTrue(ClubRole.ADMIN.canLinkCoach());
        assertTrue(ClubRole.CHAIRMAN.canLinkCoach());
        assertFalse(ClubRole.COACH.canLinkCoach());
        assertFalse(ClubRole.PLAYER.canLinkCoach());
        assertFalse(ClubRole.PARENT.canLinkCoach());
    }

    @Test
    void onlyAdminAndChairmanCanManageTrainingsOnEveryTeam() {
        assertTrue(ClubRole.ADMIN.canManageAllTrainings());
        assertTrue(ClubRole.CHAIRMAN.canManageAllTrainings());
        assertFalse(ClubRole.COACH.canManageAllTrainings());
        assertFalse(ClubRole.PLAYER.canManageAllTrainings());
        assertFalse(ClubRole.PARENT.canManageAllTrainings());
    }

    @Test
    void onlyAdminAndChairmanCanManageMatchesOnEveryTeam() {
        assertTrue(ClubRole.ADMIN.canManageAllMatches());
        assertTrue(ClubRole.CHAIRMAN.canManageAllMatches());
        assertFalse(ClubRole.COACH.canManageAllMatches());
        assertFalse(ClubRole.PLAYER.canManageAllMatches());
        assertFalse(ClubRole.PARENT.canManageAllMatches());
    }

    @Test
    void onlyAdminAndChairmanAreClubLeads() {
        assertTrue(ClubRole.ADMIN.isClubLead());
        assertTrue(ClubRole.CHAIRMAN.isClubLead());
        assertFalse(ClubRole.COACH.isClubLead());
        assertFalse(ClubRole.PLAYER.isClubLead());
        assertFalse(ClubRole.PARENT.isClubLead());
    }

    @Test
    void onlyAdminAndChairmanCanReadEveryTeam() {
        assertTrue(ClubRole.ADMIN.canReadEveryTeam());
        assertTrue(ClubRole.CHAIRMAN.canReadEveryTeam());
        assertFalse(ClubRole.COACH.canReadEveryTeam());
        assertFalse(ClubRole.PLAYER.canReadEveryTeam());
        assertFalse(ClubRole.PARENT.canReadEveryTeam());
    }

    @Test
    void adminChairmanAndCoachMayReadOtherPeople() {
        assertTrue(ClubRole.ADMIN.canReadPersonalData());
        assertTrue(ClubRole.CHAIRMAN.canReadPersonalData());
        assertTrue(ClubRole.COACH.canReadPersonalData());
        assertFalse(ClubRole.PLAYER.canReadPersonalData());
        assertFalse(ClubRole.PARENT.canReadPersonalData());
    }
}
