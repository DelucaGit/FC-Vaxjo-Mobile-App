package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;

/**
 * Story S1-2, gap analysis point 2: read endpoints still return personal data to every signed-in user.
 * These tests fail on purpose. They are excluded from {@code mvn test} by the tag {@code known-gap}.
 */
@Tag("known-gap")
class KnownPiiLeakTest extends ClubApiTest {

    @Test
    @DisplayName("S1-2: spelare ska inte lista hela användarkatalogen")
    void player_cannotListTheWholeDirectory() throws Exception {
        // GET /api/users has no role check today. PLAYER must not receive other people's contact fields.
        get(Actor.PLAYER_ALFA, "/api/users").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte lista hela användarkatalogen")
    void parent_cannotListTheWholeDirectory() throws Exception {
        get(Actor.PARENT_ALFA, "/api/users").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränare ska inte lista hela klubben")
    void coach_cannotListTheWholeDirectory() throws Exception {
        // A coach uses the team roster for their own team, not GET /api/users for every club member.
        get(Actor.COACH_ALFA, "/api/users").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte läsa en annan spelares kontaktuppgifter")
    void player_cannotReadAnotherPlayer() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte läsa ett annat barn")
    void parent_cannotReadAnotherChild() throws Exception {
        get(Actor.PARENT_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränare ska inte läsa en spelare i ett annat lag")
    void coachFromOtherTeam_cannotReadPlayer() throws Exception {
        get(Actor.COACH_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare får se sin egen rad men inte förälderns telefon")
    void player_ownRowHidesParentPhoneNumber() throws Exception {
        // The parent is another person. ADR 0006: players do not see other users' contact details.
        var response = get(Actor.PLAYER_ALFA, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk());

        assertBodyHides(response,
                ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.EMAIL_PARENT_ALFA,
                ClubFixture.NAME_PARENT_ALFA);
    }

    @Test
    @DisplayName("S1-2: spelare ska inte se laglistan med föräldrars telefon")
    void player_cannotSeePlayerPhoneNumberOnTeamRoster() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte se laglistan med föräldrars telefon")
    void parent_cannotSeePlayerPhoneNumberOnTeamRoster() throws Exception {
        get(Actor.PARENT_ALFA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränare från andra laget ska inte se spelarens telefon")
    void coachFromOtherTeam_cannotSeePlayerPhoneNumber() throws Exception {
        // mobilePhoneNumber and parentMobilePhoneNumber are x-pii. COACH is limited to their own team.
        String otherTeamRoster = "/api/teams/" + world.teamAlfaId() + "/players";

        get(Actor.COACH_BETA, otherTeamRoster)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte se tränarens telefon")
    void player_cannotSeeCoachPhoneNumber() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte se tränarens telefon")
    void parent_cannotSeeCoachPhoneNumber() throws Exception {
        get(Actor.PARENT_BETA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränare från andra laget ska inte se tränarens telefon")
    void coachFromOtherTeam_cannotSeeCoachPhoneNumber() throws Exception {
        get(Actor.COACH_BETA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte söka fram andra personer på namn")
    void player_cannotSearchByName() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/users/search", "name", "Beta")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte söka på telefonnummer")
    void parent_cannotSearchByPhoneNumber() throws Exception {
        get(Actor.PARENT_ALFA, "/api/users/search", "phone", ClubFixture.PHONE_PLAYER_BETA)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte söka på tröjnummer")
    void player_cannotSearchByShirtNumber() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/users/search", "number", String.valueOf(ClubFixture.SHIRT_BETA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränares sök träffar bara eget lag")
    void coach_searchDoesNotReturnOtherTeam() throws Exception {
        // Name search is the club directory in disguise. "Beta" must not return Lag Beta's people to Alfa's coach.
        get(Actor.COACH_ALFA, "/api/users/search", "name", "Beta")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GAP-6: saknat telefonnummer ska inte stå i feltexten")
    void missingPhoneNumber_isNotRepeatedInTheError() throws Exception {
        // Gap analysis point 6. The 404 text currently echoes the number that was searched for.
        var response = get(Actor.ADMIN, "/api/users/search", "phone", ClubFixture.PHONE_MISSING)
                .andExpect(status().isNotFound());

        assertBodyHides(response, ClubFixture.PHONE_MISSING);
    }
}
