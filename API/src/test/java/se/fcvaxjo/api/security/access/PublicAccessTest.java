package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.CreateMatchRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * GET /api/public/** needs no token.
 * The body never has an email or a phone.
 * No player data is public at all (ADR 0007). PublicLeakTest checks every GET.
 */
class PublicAccessTest extends ClubApiTest {

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
    void removedSquadEndpoint_isGone() throws Exception {
        // ADR 0007: no player data is public. The old squad route has no handler.
        get(Actor.ANON, "/api/public/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isNotFound());
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
}
