package se.fcvaxjo.api.security.access;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import se.fcvaxjo.api.model.HomeAway;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;
import se.fcvaxjo.api.support.ClubFixture;

/**
 * ?when=upcoming|past on the activity lists (issue #116).
 * The test clock says 2026-01-01 13:00 in Sweden (TestClock.START is 12:00 UTC).
 * "Upcoming" starts at midnight today, so this morning's training is still upcoming.
 * The filter only narrows a list. Team scope (ADR 0006) and "only your own" stay the same.
 */
class ActivityWhenFilterTest extends ClubApiTest {

    private static final String YESTERDAY_ALFA = "Passerat pass Alfa";
    private static final String THIS_MORNING_ALFA = "Morgonpass Alfa";
    private static final String YESTERDAY_BETA = "Passerat pass Beta";
    private static final String OLD_OPPONENT_ALFA = "Gammal motstandare Alfa";
    private static final String OLD_OPPONENT_BETA = "Gammal motstandare Beta";

    @Autowired
    private TrainingRepository trainings;

    @Autowired
    private MatchRepository matches;

    @BeforeEach
    void addPastAndTodayActivities() {
        // The fixture's own trainings and matches are later in 2026, so they are upcoming.
        saveTraining(world.teamAlfaId(), YESTERDAY_ALFA, LocalDateTime.of(2025, 12, 31, 18, 0));
        saveTraining(world.teamAlfaId(), THIS_MORNING_ALFA, LocalDateTime.of(2026, 1, 1, 8, 0));
        saveTraining(world.teamBetaId(), YESTERDAY_BETA, LocalDateTime.of(2025, 12, 31, 18, 0));
        saveMatch(world.teamAlfaId(), OLD_OPPONENT_ALFA, LocalDateTime.of(2025, 12, 20, 14, 0));
        saveMatch(world.teamBetaId(), OLD_OPPONENT_BETA, LocalDateTime.of(2025, 12, 20, 14, 0));
    }

    @Test
    void coach_upcomingTrainings_keepThisMorningButNotYesterday() throws Exception {
        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamAlfaId() + "&when=upcoming")
                .andExpect(status().isOk())
                // Soonest first: this morning comes before the fixture's November training.
                .andExpect(jsonPath("$[0].title").value(THIS_MORNING_ALFA))
                .andExpect(content().string(containsString("Testtraning Alfa")))
                .andExpect(content().string(not(containsString(YESTERDAY_ALFA))));
    }

    @Test
    void coach_pastTrainings_onlyPassedOnes() throws Exception {
        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamAlfaId() + "&when=past")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value(YESTERDAY_ALFA));
    }

    @Test
    void coach_noWhen_stillListsEverything() throws Exception {
        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamAlfaId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void coach_cannotUseFilterOnAnotherTeam() throws Exception {
        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamBetaId() + "&when=past")
                .andExpect(status().isForbidden());
        get(Actor.COACH_ALFA, "/api/matches?teamId=" + world.teamBetaId() + "&when=past")
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidWhen_isBadRequestInSwedish() throws Exception {
        get(Actor.COACH_ALFA, "/api/trainings?teamId=" + world.teamAlfaId() + "&when=soon")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("upcoming eller past")));
    }

    @Test
    void coach_pastMatches_onlyPassedOnesOfOwnTeam() throws Exception {
        get(Actor.COACH_ALFA, "/api/matches?teamId=" + world.teamAlfaId() + "&when=past")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].opponent").value(OLD_OPPONENT_ALFA));
    }

    @Test
    void coach_upcomingMatches_noPassedOnes() throws Exception {
        get(Actor.COACH_ALFA, "/api/matches?teamId=" + world.teamAlfaId() + "&when=upcoming")
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(ClubFixture.OPPONENT_ALFA)))
                .andExpect(content().string(not(containsString(OLD_OPPONENT_ALFA))));
    }

    @Test
    void player_upcomingTrainings_ownTeamFromToday() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/trainings?when=upcoming")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value(THIS_MORNING_ALFA))
                .andExpect(content().string(not(containsString(YESTERDAY_ALFA))))
                .andExpect(content().string(not(containsString("Testtraning Beta"))));
    }

    @Test
    void player_pastMatches_onlyOwnTeam() throws Exception {
        get(Actor.PLAYER_ALFA, "/api/my/matches?when=past")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].opponent").value(OLD_OPPONENT_ALFA));
    }

    @Test
    void parent_pastTrainings_onlyOwnChild() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/trainings?childId=" + world.playerAlfaId() + "&when=past")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value(YESTERDAY_ALFA));
    }

    @Test
    void parent_cannotUseFilterOnAnotherChild() throws Exception {
        get(Actor.PARENT_ALFA, "/api/my/matches?childId=" + world.playerBetaId() + "&when=past")
                .andExpect(status().isForbidden());
    }

    private void saveTraining(Long teamId, String title, LocalDateTime startsAt) {
        Training training = new Training();
        training.setTeamId(teamId);
        training.setStartsAt(startsAt);
        training.setEndsAt(startsAt.plusMinutes(90));
        training.setTitle(title);
        training.setCreatedByUserId(world.adminId());
        trainings.save(training);
    }

    private void saveMatch(Long teamId, String opponent, LocalDateTime kickoffAt) {
        Match match = new Match();
        match.setTeamId(teamId);
        match.setOpponent(opponent);
        match.setKickoffAt(kickoffAt);
        match.setVenue(ClubFixture.VENUE_ALFA);
        match.setHomeAway(HomeAway.HOME);
        match.setCreatedByUserId(world.adminId());
        matches.save(match);
    }
}
