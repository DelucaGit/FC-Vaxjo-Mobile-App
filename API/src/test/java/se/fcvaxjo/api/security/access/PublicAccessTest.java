package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.DTO.CreateMatchRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * GET /api/public/** needs no token.
 * The body never has an email or a phone.
 * A player is listed only after the linked parent has consented, and only by name and shirt number.
 */
class PublicAccessTest extends ClubApiTest {

    @Autowired
    private UserRepository users;

    @Test
    void anonymous_canListTeamsWithoutPeople() throws Exception {
        get(Actor.ANON, "/api/public/teams")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.TEAM_ALFA)))
                .andExpect(content().string(containsString(ClubFixture.TEAM_BETA)))
                .andExpect(content().string(not(containsString("@"))));
    }

    @Test
    void eachRole_canListPublicTeams() throws Exception {
        for (Actor actor : signedInRoles()) {
            get(actor, "/api/public/teams").andExpect(status().isOk());
        }
    }

    @Test
    void anonymous_seesUpcomingFixturesButNoContactDetails() throws Exception {
        get(Actor.ANON, "/api/public/matches/upcoming")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_BETA)))
                .andExpect(content().string(not(containsString("createdByUserId"))))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))));
    }

    @Test
    void anonymous_canFilterUpcomingByTeam() throws Exception {
        get(Actor.ANON, "/api/public/matches/upcoming?teamId=" + world.teamAlfaId())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(ClubFixture.OPPONENT_BETA))));
    }

    @Test
    void eachRole_canReadUpcomingMatches() throws Exception {
        for (Actor actor : signedInRoles()) {
            get(actor, "/api/public/matches/upcoming").andExpect(status().isOk());
        }
    }

    @Test
    void pastMatch_isHistoryAndNotUpcoming() throws Exception {
        CreateMatchRequest past = SampleRequests.match(world.teamAlfaId());
        past.setKickoffAt(LocalDateTime.of(2026, 10, 1, 14, 0));
        past.setOpponent("Gammal motstandare");
        post(Actor.COACH_ALFA, "/api/matches", past).andExpect(status().isCreated());

        get(Actor.ANON, "/api/public/matches/history")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Gammal motstandare")))
                .andExpect(content().string(not(containsString(ClubFixture.OPPONENT_ALFA))))
                .andExpect(content().string(not(containsString("@"))));

        get(Actor.ANON, "/api/public/matches/upcoming")
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("Gammal motstandare"))));
    }

    @Test
    void eachRole_canReadMatchHistory() throws Exception {
        for (Actor actor : signedInRoles()) {
            get(actor, "/api/public/matches/history").andExpect(status().isOk());
        }
    }

    @Test
    void squad_hidesEveryPlayerUntilAParentConsents() throws Exception {
        get(Actor.ANON, alfaSquad())
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_BETA))))
                .andExpect(content().string(not(containsString("@"))))
                .andExpect(content().string(not(containsString("070-"))));
    }

    @Test
    void squad_showsOnlyNameAndShirtAfterConsent() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk());

        get(Actor.ANON, alfaSquad())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value(ClubFixture.NAME_PLAYER_ALFA))
                .andExpect(jsonPath("$[0].playerNumber").value(ClubFixture.SHIRT_ALFA))
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PARENT_ALFA))))
                .andExpect(content().string(not(containsString("Test Spelare Extra"))))
                .andExpect(content().string(not(containsString("email"))))
                .andExpect(content().string(not(containsString("mobilePhoneNumber"))));
    }

    @Test
    void revokedConsent_dropsThePlayerAtOnce() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk());
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(false))
                .andExpect(status().isOk());

        get(Actor.ANON, alfaSquad())
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_ALFA))));
    }

    @Test
    void inactivePlayer_isNeverOnTheSquad() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk());
        AppUser player = users.findById(world.playerAlfaId()).orElseThrow();
        player.setActive(false);
        users.save(player);

        get(Actor.ANON, alfaSquad())
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_ALFA))));
    }

    @Test
    void inactiveParent_hidesTheChildBecauseTheyCannotRevoke() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk());
        AppUser parent = users.findById(world.parentAlfaId()).orElseThrow();
        parent.setActive(false);
        users.save(parent);

        get(Actor.ANON, alfaSquad())
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(ClubFixture.NAME_PLAYER_ALFA))));
    }

    @Test
    void eachRole_canReadTheSquad() throws Exception {
        for (Actor actor : signedInRoles()) {
            get(actor, alfaSquad()).andExpect(status().isOk());
        }
    }

    @Test
    void anonymous_cannotWriteUnderPublic() throws Exception {
        post(Actor.ANON, "/api/public/teams", java.util.Map.of())
                .andExpect(status().isUnauthorized());
        put(Actor.ANON, "/api/public/matches/upcoming", java.util.Map.of())
                .andExpect(status().isUnauthorized());
        delete(Actor.ANON, "/api/public/teams/" + world.teamAlfaId())
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signedInPlayer_cannotPostToAPublicPath() throws Exception {
        // Authenticated, but there is no write method. 405, not a saved row.
        post(Actor.PLAYER_ALFA, "/api/public/teams", java.util.Map.of())
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void plannedCoachContact_isNotOpen() throws Exception {
        // Still planned. The GET is permitted by the prefix, and there is no handler.
        get(Actor.ANON, "/api/public/teams/" + world.teamAlfaId() + "/coaches")
                .andExpect(status().isNotFound());
        assertBodyHides(
                get(Actor.ANON, "/api/public/teams/" + world.teamAlfaId() + "/coaches"),
                ClubFixture.PHONE_COACH_ALFA,
                ClubFixture.EMAIL_COACH_ALFA);
    }

    private Actor[] signedInRoles() {
        return new Actor[] {
                Actor.ADMIN,
                Actor.CHAIRMAN,
                Actor.COACH_ALFA,
                Actor.PLAYER_ALFA,
                Actor.PARENT_ALFA
        };
    }

    private String alfaSquad() {
        return "/api/public/teams/" + world.teamAlfaId() + "/players";
    }

    private String consent(long playerId) {
        return "/api/users/" + playerId + "/public-consent";
    }
}
