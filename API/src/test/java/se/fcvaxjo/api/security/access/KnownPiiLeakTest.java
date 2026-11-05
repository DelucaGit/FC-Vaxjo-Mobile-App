package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.SearchUsersRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Gap analysis point 2: who may read other people's contact details.
 *
 * PLAYER and PARENT are refused on the lists, the search, and someone else's row.
 * A coach is limited to teams they are linked to in team_coaches (S1-10).
 * A player's own row hides the parent's name, email and phone (F6, decision c).
 * Those tests run in the normal suite. No test is tagged {@code known-gap}.
 * A missing phone number is not repeated in the 404 text (gap 6, story S1-12).
 */
class KnownPiiLeakTest extends ClubApiTest {

    @Test
    @DisplayName("S1-2: spelare ska inte lista hela användarkatalogen")
    void player_cannotListTheWholeDirectory() throws Exception {
        // The list contains other people's email and phone.
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
        // The club list is every person. A coach opens one team they train instead.
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
        // Alfa's coach has no team_coaches row for Lag Beta.
        get(Actor.COACH_ALFA, "/api/users/" + world.playerBetaId())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("F6: spelare får se sin egen rad men inte förälderns fält")
    void player_ownRowHidesParentPhoneNumber() throws Exception {
        // Decision (c): name, email and phone are all hidden. The coach still sees them.
        var response = get(Actor.PLAYER_ALFA, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(ClubFixture.NAME_PLAYER_ALFA))
                .andExpect(jsonPath("$.email").value(ClubFixture.EMAIL_PLAYER_ALFA))
                .andExpect(jsonPath("$.parentName").value(nullValue()))
                .andExpect(jsonPath("$.parentEmail").value(nullValue()))
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(nullValue()));

        assertBodyHides(response,
                ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.EMAIL_PARENT_ALFA,
                ClubFixture.NAME_PARENT_ALFA);
    }

    @Test
    @DisplayName("F6: tränare i laget ser fortfarande förälderns telefon")
    void coach_ownTeamStillSeesParentPhone() throws Exception {
        get(Actor.COACH_ALFA, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(ClubFixture.PHONE_PARENT_ALFA))
                .andExpect(jsonPath("$.parentEmail").value(ClubFixture.EMAIL_PARENT_ALFA))
                .andExpect(jsonPath("$.parentName").value(ClubFixture.NAME_PARENT_ALFA));
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
        // mobilePhoneNumber and parentMobilePhoneNumber are x-pii. COACH_BETA does not train Lag Alfa.
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
        // Same team_coaches rule as the player roster.
        get(Actor.COACH_BETA, "/api/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte söka fram andra personer på namn")
    void player_cannotSearchByName() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/users/search", "name", "Beta")
                .andExpect(status().isMethodNotAllowed());
        post(Actor.PLAYER_ALFA, "/api/users/search", SampleRequests.searchByName("Beta"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: förälder ska inte söka på telefonnummer")
    void parent_cannotSearchByPhoneNumber() throws Exception {
        post(Actor.PARENT_ALFA, "/api/users/search", SampleRequests.searchByPhone(ClubFixture.PHONE_PLAYER_BETA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: spelare ska inte söka på tröjnummer")
    void player_cannotSearchByShirtNumber() throws Exception {
        post(Actor.PLAYER_ALFA, "/api/users/search", SampleRequests.searchByShirt(ClubFixture.SHIRT_BETA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S1-2: tränares sök träffar bara eget lag")
    void coach_searchDoesNotReturnOtherTeam() throws Exception {
        // "Beta" is the other team. Those people are not on Alfa's teams, so the list is empty.
        post(Actor.COACH_ALFA, "/api/users/search", SampleRequests.searchByName("Beta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GAP-6: saknat telefonnummer ska inte stå i feltexten")
    void missingPhoneNumber_isNotRepeatedInTheError() throws Exception {
        // The caller already sent the number. ADR 0004 says the 404 must not repeat it.
        var response = post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByPhone(ClubFixture.PHONE_MISSING))
                .andExpect(status().isNotFound());

        assertBodyHides(response, ClubFixture.PHONE_MISSING);
    }

    @Test
    @DisplayName("F1: sök med telefon i kroppen och GET är inte en sökning")
    void searchByPhone_usesPostBodyAndGetIsNotASearch() throws Exception {
        post(Actor.ADMIN, "/api/users/search", SampleRequests.searchByPhone(ClubFixture.PHONE_PLAYER_ALFA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(ClubFixture.EMAIL_PLAYER_ALFA));

        get(Actor.ADMIN, "/api/users/search", "phone", ClubFixture.PHONE_PLAYER_ALFA)
                .andExpect(status().isMethodNotAllowed());

        post(Actor.ADMIN, "/api/users/search", new SearchUsersRequest())
                .andExpect(status().isBadRequest());

        SearchUsersRequest both = SampleRequests.searchByName("Alfa");
        both.setPhone(ClubFixture.PHONE_PLAYER_ALFA);
        post(Actor.ADMIN, "/api/users/search", both)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Send exactly one of name, playerNumber or phone"));
    }
}
