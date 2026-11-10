package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import se.fcvaxjo.api.service.PublicConsentService;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Only the linked parent may publish a child's name and shirt number.
 * Every other role, and a missing id, get the same 403.
 */
class PublicConsentAccessTest extends ClubApiTest {

    private static final long UNKNOWN_ID = 9_000_000L;

    @Test
    void parent_canGrantAndTheAnswerHasNoContactDetails() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(world.playerAlfaId()))
                .andExpect(jsonPath("$.publicConsent").value(true))
                .andExpect(jsonPath("$.publicConsentAt").isNotEmpty())
                .andExpect(content().string(not(containsString(ClubFixture.EMAIL_PLAYER_ALFA))))
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PLAYER_ALFA))));
    }

    @Test
    void parent_canRevoke() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk());
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicConsent").value(false))
                .andExpect(jsonPath("$.publicConsentAt").value(nullValue()));
    }

    @Test
    void secondGrant_keepsTheFirstTimestamp() throws Exception {
        MvcResult first = put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult second = put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isOk())
                .andReturn();

        String firstStamp = json.readTree(first.getResponse().getContentAsString())
                .get("publicConsentAt").asString();
        String secondStamp = json.readTree(second.getResponse().getContentAsString())
                .get("publicConsentAt").asString();
        assertEquals(firstStamp, secondStamp);
    }

    @Test
    void parent_cannotConsentForAnotherChild() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerBetaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(PublicConsentService.DENIED));
    }

    @Test
    void parent_missingPlayer_usesTheSameForbiddenAnswer() throws Exception {
        put(Actor.PARENT_ALFA, consent(UNKNOWN_ID), SampleRequests.consent(true))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(PublicConsentService.DENIED));
    }

    @Test
    void player_cannotConsentForThemselves() throws Exception {
        // A player in this app has a parent. The child does not publish their own name.
        put(Actor.PLAYER_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_cannotSetConsent() throws Exception {
        put(Actor.COACH_ALFA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotSetConsent() throws Exception {
        put(Actor.ADMIN, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden());
    }

    @Test
    void chairman_cannotSetConsent() throws Exception {
        put(Actor.CHAIRMAN, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden());
    }

    @Test
    void otherParent_cannotSetConsent() throws Exception {
        put(Actor.PARENT_BETA, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(PublicConsentService.DENIED));
    }

    @Test
    void anonymous_cannotSetConsent() throws Exception {
        put(Actor.ANON, consent(world.playerAlfaId()), SampleRequests.consent(true))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingFlag_isBadRequest() throws Exception {
        put(Actor.PARENT_ALFA, consent(world.playerAlfaId()), java.util.Map.of())
                .andExpect(status().isBadRequest());
    }

    private String consent(long playerId) {
        return "/api/users/" + playerId + "/public-consent";
    }
}
