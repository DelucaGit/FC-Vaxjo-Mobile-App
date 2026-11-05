package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.UpdatePlayerRequest;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;
import se.fcvaxjo.api.support.SampleRequests;

/**
 * User reads and writes that already match the target.
 * Reads that still leak personal data are in {@link KnownPiiLeakTest}.
 * Coach writes outside the coach's own team are in {@link KnownCoachScopeTest}.
 */
class UserDirectoryAccessTest extends ClubApiTest {

    @Test
    void admin_seesParentPhonesInTheDirectory() throws Exception {
        // ADMIN has full access (ADR 0006). Parent phone is x-pii and this role may see it.
        get(Actor.ADMIN, "/api/users")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.PHONE_PARENT_ALFA)))
                .andExpect(content().string(containsString(ClubFixture.PHONE_PARENT_BETA)));
    }

    @Test
    void coach_seesParentPhoneForPlayerOnOwnTeam() throws Exception {
        // A coach needs the parent's phone to run their own team. x-scope allows that.
        get(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.PHONE_PARENT_ALFA)));
    }

    @Test
    void coach_ownTeamRosterDoesNotIncludeTheOtherTeam() throws Exception {
        // This URL is already one team. Asking for the other team's URL is refused (S1-10).
        get(Actor.COACH_ALFA, "/api/teams/" + world.teamAlfaId() + "/players")
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(ClubFixture.PHONE_PARENT_BETA))));
    }

    @Test
    void admin_canCreatePlayer() throws Exception {
        // x-roles: ADMIN may create users.
        post(Actor.ADMIN, "/api/users", alfaPlayer("ny.admin@example.test", "070-0000-0181", 81))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_canCreatePlayerOnOwnTeam() throws Exception {
        // x-scope: COACH may create a PLAYER. Own team is allowed.
        post(Actor.COACH_ALFA, "/api/users", alfaPlayer("ny.tranare@example.test", "070-0000-0182", 82))
                .andExpect(status().isCreated());
    }

    @Test
    void coach_cannotCreateCoachAccount() throws Exception {
        // x-scope today: COACH may only create PLAYER, not another COACH.
        post(Actor.COACH_ALFA, "/api/users", SampleRequests.newCoach("ny.coach.roll@example.test"))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotCreateUser() throws Exception {
        // PLAYER is not in x-roles for POST /api/users.
        post(Actor.PLAYER_ALFA, "/api/users", alfaPlayer("blockerad.spelare@example.test", "070-0000-0183", 83))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotCreateUser() throws Exception {
        post(Actor.PARENT_ALFA, "/api/users", alfaPlayer("blockerad.foralder@example.test", "070-0000-0185", 85))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_canUpdatePlayer() throws Exception {
        put(Actor.ADMIN, "/api/users/" + world.playerAlfaId() + "/player", keepAlfaPlayer())
                .andExpect(status().isOk());
    }

    @Test
    void coach_canUpdatePlayerOnOwnTeam() throws Exception {
        put(Actor.COACH_ALFA, "/api/users/" + world.playerAlfaId() + "/player", keepAlfaPlayer())
                .andExpect(status().isOk());
    }

    @Test
    void player_cannotUpdatePlayer() throws Exception {
        put(Actor.PLAYER_ALFA, "/api/users/" + world.playerAlfaId() + "/player", keepAlfaPlayer())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotUpdatePlayer() throws Exception {
        put(Actor.PARENT_ALFA, "/api/users/" + world.playerAlfaId() + "/player", keepAlfaPlayer())
                .andExpect(status().isForbidden());
    }

    @Test
    void coach_canRemovePlayerOnOwnTeam() throws Exception {
        // Soft-delete sets active=false. Own-team COACH is allowed (x-roles ADMIN, COACH).
        delete(Actor.COACH_ALFA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isNoContent());
    }

    @Test
    void player_cannotRemovePlayer() throws Exception {
        delete(Actor.PLAYER_ALFA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotRemovePlayer() throws Exception {
        delete(Actor.PARENT_ALFA, "/api/users/" + world.extraPlayerId())
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_canChangeRole() throws Exception {
        // x-roles today: only ADMIN. Keeping the same role is enough to show the call is allowed.
        put(Actor.ADMIN, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("PLAYER"))
                .andExpect(status().isOk());
    }

    @Test
    void coach_cannotChangeRole() throws Exception {
        put(Actor.COACH_ALFA, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("PLAYER"))
                .andExpect(status().isForbidden());
    }

    @Test
    void player_cannotChangeRole() throws Exception {
        put(Actor.PLAYER_ALFA, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("COACH"))
                .andExpect(status().isForbidden());
    }

    @Test
    void parent_cannotChangeRole() throws Exception {
        put(Actor.PARENT_BETA, "/api/users/" + world.extraPlayerId() + "/role", SampleRequests.role("COACH"))
                .andExpect(status().isForbidden());
    }

    private CreateUserRequest alfaPlayer(String email, String phone, int shirt) {
        return SampleRequests.newPlayer(email, phone, shirt, world.parentAlfaId(), world.teamAlfaId());
    }

    private UpdatePlayerRequest keepAlfaPlayer() {
        return SampleRequests.keepPlayer(
                ClubFixture.NAME_PLAYER_ALFA,
                ClubFixture.EMAIL_PLAYER_ALFA,
                ClubFixture.PHONE_PLAYER_ALFA,
                ClubFixture.SHIRT_ALFA,
                world.teamAlfaId());
    }
}
