package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * F4: an inactive parent must not show name, email or phone.
 * Linking a player to that parent, or to someone who is not a parent, is 400.
 */
class InactiveParentAccessTest extends ClubApiTest {

    @Autowired
    private UserRepository users;

    @Test
    @DisplayName("F4: inaktiv förälder ger tomma kontaktfält för admin")
    void admin_inactiveParent_hidesContactFields() throws Exception {
        deactivateParentAlfa();

        var user = get(Actor.ADMIN, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentName").value(nullValue()))
                .andExpect(jsonPath("$.parentEmail").value(nullValue()))
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(nullValue()));
        assertBodyHides(user, ClubFixture.EMAIL_PARENT_ALFA, ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.NAME_PARENT_ALFA);

        var roster = get(Actor.ADMIN, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isOk());
        assertBodyHides(roster, ClubFixture.EMAIL_PARENT_ALFA, ClubFixture.PHONE_PARENT_ALFA,
                ClubFixture.NAME_PARENT_ALFA);
    }

    @Test
    @DisplayName("F4: inaktiv förälder ger tomma kontaktfält för tränaren i laget")
    void coach_inactiveParent_hidesContactFields() throws Exception {
        deactivateParentAlfa();

        get(Actor.COACH_ALFA, "/api/users/" + world.playerAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentEmail").value(nullValue()))
                .andExpect(jsonPath("$.parentMobilePhoneNumber").value(nullValue()))
                .andExpect(jsonPath("$.parentName").value(nullValue()));
    }

    @Test
    @DisplayName("F4: inaktiv parentId ger 400 när en spelare skapas")
    void createPlayer_inactiveParent_isBadRequest() throws Exception {
        deactivateParentAlfa();

        post(Actor.ADMIN, "/api/users",
                SampleRequests.newPlayer("ny.inaktiv.foralder@example.test", "070-0000-0191", 91,
                        world.parentAlfaId(), world.teamAlfaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot link an inactive parent"));
    }

    @Test
    @DisplayName("F4: parentId som inte är förälder ger 400")
    void createPlayer_parentIdIsNotAParent_isBadRequest() throws Exception {
        post(Actor.CHAIRMAN, "/api/users",
                SampleRequests.newPlayer("ny.fel.roll@example.test", "070-0000-0192", 92,
                        world.playerBetaId(), world.teamAlfaId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("parentId must point to a user with role PARENT"));
    }

    private void deactivateParentAlfa() {
        AppUser parent = users.findById(world.parentAlfaId()).orElseThrow();
        parent.setActive(false);
        users.save(parent);
    }
}
