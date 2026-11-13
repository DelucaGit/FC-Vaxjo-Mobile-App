package se.fcvaxjo.api.security.access;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;

/**
 * Issue #118: a training has a fixed type, FOOTBALL or FITNESS, instead of a free-text title.
 * An unknown type is a 400 with a Swedish message. A row saved before the type column
 * existed is shown as FOOTBALL.
 */
class TrainingTypeTest extends ClubApiTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void coach_canCreateFootballTraining() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", body("FOOTBALL"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("FOOTBALL"));
    }

    @Test
    void coach_canCreateFitnessTraining() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", body("FITNESS"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("FITNESS"));
    }

    @Test
    void unknownType_isBadRequestWithSwedishMessage() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", body("YOGA"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Okänd träningstyp. Välj FOOTBALL eller FITNESS"));
    }

    @Test
    void missingType_isBadRequest() throws Exception {
        post(Actor.COACH_ALFA, "/api/trainings", Map.of(
                "teamId", world.teamAlfaId(),
                "startsAt", "2026-12-01T18:00:00",
                "endsAt", "2026-12-01T19:00:00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Träningstyp krävs (FOOTBALL eller FITNESS)"));
    }

    @Test
    void unknownTypeOnEdit_isBadRequest() throws Exception {
        put(Actor.COACH_ALFA, "/api/trainings/" + world.trainingAlfaId(), Map.of(
                "startsAt", "2026-12-02T18:00:00",
                "endsAt", "2026-12-02T19:30:00",
                "type", "YOGA"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void oldTrainingWithoutType_isShownAsFootball() throws Exception {
        jdbc.update("UPDATE trainings SET type = NULL WHERE id = ?", world.trainingAlfaId());

        get(Actor.COACH_ALFA, "/api/trainings/" + world.trainingAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FOOTBALL"));

        get(Actor.PLAYER_ALFA, "/api/my/trainings")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("FOOTBALL"));
    }

    private Map<String, Object> body(String type) {
        return Map.of(
                "teamId", world.teamAlfaId(),
                "startsAt", "2026-12-01T18:00:00",
                "endsAt", "2026-12-01T19:00:00",
                "type", type);
    }
}
