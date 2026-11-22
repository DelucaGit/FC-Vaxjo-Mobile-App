package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.CreateTrainingRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * Saved venues (issue #217). One list shared by the whole club.
 * COACH, CHAIRMAN and ADMIN list, add and remove. PLAYER and PARENT 403, ANON 401.
 * The name is required and unique, compared case-insensitive after trim.
 * Removing a saved venue does not change trainings or matches; they keep their own venue text.
 */
class SavedVenueAccessTest extends ClubApiTest {

    private static final String PATH = "/api/saved-venues";
    private static final long UNKNOWN_ID = 999_999L;
    private static final String NAME = "Kronobergsvallen 1";

    // ---- list ----

    @Test
    void admin_lists() throws Exception {
        create(Actor.COACH_ALFA, NAME, null);
        get(Actor.ADMIN, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value(NAME));
    }

    @Test
    void chairman_lists() throws Exception {
        create(Actor.COACH_ALFA, NAME, null);
        get(Actor.CHAIRMAN, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void coach_listsVenuesAddedByAnotherTeamsCoach() throws Exception {
        // The list is shared by the whole club, not per team.
        create(Actor.COACH_ALFA, NAME, null);
        get(Actor.COACH_BETA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value(NAME));
    }

    @Test
    void list_isSortedByName() throws Exception {
        create(Actor.COACH_ALFA, "Teleborg", null);
        create(Actor.COACH_ALFA, "arenan", null);
        create(Actor.COACH_ALFA, "Bergsvallen", null);
        get(Actor.COACH_ALFA, PATH)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].name").value("arenan"))
                .andExpect(jsonPath("$[1].name").value("Bergsvallen"))
                .andExpect(jsonPath("$[2].name").value("Teleborg"));
    }

    @Test
    void player_cannotList() throws Exception {
        get(Actor.PLAYER_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotList() throws Exception {
        get(Actor.PARENT_ALFA, PATH).andExpect(status().isForbidden());
    }

    @Test
    void anon_cannotList() throws Exception {
        get(Actor.ANON, PATH).andExpect(status().isUnauthorized());
    }

    // ---- add: who may ----

    @Test
    void coach_adds_withAllFields() throws Exception {
        post(Actor.COACH_ALFA, PATH, venue("  " + NAME + "  ", "  Arabygatan 1, Växjö  "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name").value(NAME))
                .andExpect(jsonPath("$.address").value("Arabygatan 1, Växjö"))
                .andExpect(jsonPath("$.createdByUserId").value(world.coachAlfaId()));
    }

    @Test
    void chairman_adds() throws Exception {
        post(Actor.CHAIRMAN, PATH, venue(NAME, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(NAME));
    }

    @Test
    void admin_adds() throws Exception {
        post(Actor.ADMIN, PATH, venue(NAME, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(NAME));
    }

    @Test
    void player_cannotAdd() throws Exception {
        post(Actor.PLAYER_ALFA, PATH, venue(NAME, null)).andExpect(status().isForbidden());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void parent_cannotAdd() throws Exception {
        post(Actor.PARENT_ALFA, PATH, venue(NAME, null)).andExpect(status().isForbidden());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void anon_cannotAdd() throws Exception {
        post(Actor.ANON, PATH, venue(NAME, null)).andExpect(status().isUnauthorized());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    // ---- add: rules ----

    @Test
    void addressIsOptional() throws Exception {
        post(Actor.COACH_ALFA, PATH, venue(NAME, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.address", nullValue()));
    }

    @Test
    void blankAddress_isStoredAsNull() throws Exception {
        post(Actor.COACH_ALFA, PATH, venue(NAME, "   "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.address", nullValue()));
    }

    @Test
    void missingName_isRejected() throws Exception {
        post(Actor.COACH_ALFA, PATH, venue(null, "Arabygatan 1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void blankName_isRejected() throws Exception {
        post(Actor.COACH_ALFA, PATH, venue("   ", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void duplicateName_isRejectedWithSwedishMessage() throws Exception {
        create(Actor.COACH_ALFA, NAME, null);
        post(Actor.COACH_BETA, PATH, venue(NAME, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Det finns redan en sparad plats med det namnet."));
    }

    @Test
    void duplicateName_isComparedCaseInsensitiveAndTrimmed() throws Exception {
        create(Actor.COACH_ALFA, NAME, null);
        post(Actor.ADMIN, PATH, venue("  kronobergsVALLEN 1 ", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Det finns redan en sparad plats med det namnet."));
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void nameMayBeReusedAfterRemoval() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.COACH_ALFA, PATH + "/" + id).andExpect(status().isNoContent());
        post(Actor.COACH_ALFA, PATH, venue(NAME, null)).andExpect(status().isCreated());
    }

    // ---- remove ----

    @Test
    void coach_removesVenueAddedByAnotherCoach() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.COACH_BETA, PATH + "/" + id).andExpect(status().isNoContent());
        get(Actor.COACH_ALFA, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void chairman_removes() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.CHAIRMAN, PATH + "/" + id).andExpect(status().isNoContent());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void admin_removes() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.ADMIN, PATH + "/" + id).andExpect(status().isNoContent());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void unknownVenue_isNotFound() throws Exception {
        delete(Actor.ADMIN, PATH + "/" + UNKNOWN_ID).andExpect(status().isNotFound());
    }

    @Test
    void player_cannotRemove() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.PLAYER_ALFA, PATH + "/" + id).andExpect(status().isForbidden());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void parent_cannotRemove() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.PARENT_ALFA, PATH + "/" + id).andExpect(status().isForbidden());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void anon_cannotRemove() throws Exception {
        long id = create(Actor.COACH_ALFA, NAME, null);
        delete(Actor.ANON, PATH + "/" + id).andExpect(status().isUnauthorized());
        get(Actor.ADMIN, PATH).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void removingVenue_keepsTheTrainingsVenue() throws Exception {
        long venueId = create(Actor.COACH_ALFA, NAME, null);
        CreateTrainingRequest training = SampleRequests.training(world.teamAlfaId());
        training.setVenue(NAME);
        String body = post(Actor.COACH_ALFA, "/api/trainings", training)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long trainingId = json.readTree(body).get("id").asLong();

        delete(Actor.COACH_ALFA, PATH + "/" + venueId).andExpect(status().isNoContent());

        get(Actor.COACH_ALFA, "/api/trainings/" + trainingId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.venue").value(NAME));
    }

    // ---- helpers ----

    private long create(Actor actor, String name, String address) throws Exception {
        String body = post(actor, PATH, venue(name, address))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private static Map<String, Object> venue(String name, String address) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("address", address);
        return body;
    }
}
