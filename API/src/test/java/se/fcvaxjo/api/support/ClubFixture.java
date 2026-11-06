package se.fcvaxjo.api.support;

import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.AttendanceStatus;
import se.fcvaxjo.api.model.HomeAway;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.security.JwtService;

/**
 * Fake club used by the role tests. Nothing here is a real person.
 * Alfa and Beta exist so a test can say "own team" and "other team".
 * The extra Alfa player exists so a delete test has someone to remove.
 * The inactive player exists so we can check an old token (gap analysis point 4).
 * CHAIRMAN is seeded by RoleSeeder, same as the other roles (ADR 0006).
 */
public final class ClubFixture {

    public static final String EMAIL_ADMIN = "admin@example.test";
    public static final String EMAIL_CHAIRMAN = "ordforande@example.test";
    public static final String EMAIL_COACH_ALFA = "tranare.alfa@example.test";
    public static final String EMAIL_COACH_BETA = "tranare.beta@example.test";
    public static final String EMAIL_PLAYER_ALFA = "spelare.alfa@example.test";
    public static final String EMAIL_PLAYER_BETA = "spelare.beta@example.test";
    public static final String EMAIL_EXTRA = "spelare.extra@example.test";
    public static final String EMAIL_INACTIVE = "spelare.inaktiv@example.test";
    public static final String EMAIL_PARENT_ALFA = "foralder.alfa@example.test";
    public static final String EMAIL_PARENT_BETA = "foralder.beta@example.test";

    public static final String PHONE_COACH_ALFA = "070-0000-0110";
    public static final String PHONE_COACH_BETA = "070-0000-0210";
    public static final String PHONE_PLAYER_ALFA = "070-0000-0102";
    public static final String PHONE_PLAYER_BETA = "070-0000-0202";
    public static final String PHONE_EXTRA = "070-0000-0103";
    public static final String PHONE_INACTIVE = "070-0000-0104";
    public static final String PHONE_PARENT_ALFA = "070-0000-0101";
    public static final String PHONE_PARENT_BETA = "070-0000-0201";
    public static final String PHONE_MISSING = "070-0000-9999";

    public static final String NAME_PLAYER_ALFA = "Test Spelare Alfa";
    public static final String NAME_PLAYER_BETA = "Test Spelare Beta";
    public static final String NAME_PARENT_ALFA = "Test Foralder Alfa";
    public static final String NAME_CHILD_TOKEN = "Test Spelare Alfa";

    public static final String TEAM_ALFA = "Lag Alfa";
    public static final String TEAM_BETA = "Lag Beta";

    public static final String OPPONENT_ALFA = "Motstandare Alfa";
    public static final String OPPONENT_BETA = "Motstandare Beta";
    public static final String VENUE_ALFA = "Tipshallen Alfa";
    public static final String VENUE_BETA = "Bortaplan Beta";

    public static final int SHIRT_ALFA = 11;
    public static final int SHIRT_BETA = 22;

    private ClubFixture() {
    }

    public static ClubWorld load(
            RoleRepository roles,
            UserRepository users,
            TeamRepository teams,
            TeamCoachRepository links,
            TrainingRepository trainings,
            TrainingAttendanceRepository attendance,
            MatchRepository matches,
            PasswordEncoder encoder,
            JwtService jwt,
            String sharedLogin) {

        long adminRole = requiredRole(roles, "ADMIN");
        long coachRole = requiredRole(roles, "COACH");
        long playerRole = requiredRole(roles, "PLAYER");
        long parentRole = requiredRole(roles, "PARENT");
        long chairmanRole = requiredRole(roles, "CHAIRMAN");

        Team alfa = saveTeam(teams, TEAM_ALFA);
        Team beta = saveTeam(teams, TEAM_BETA);

        String hash = encoder.encode(sharedLogin);

        AppUser admin = saveUser(users, "Test Admin", EMAIL_ADMIN, adminRole,
                null, null, null, null, true, hash);
        AppUser chairman = saveUser(users, "Test Ordforande", EMAIL_CHAIRMAN, chairmanRole,
                null, null, null, null, true, hash);
        AppUser coachAlfa = saveUser(users, "Test Tranare Alfa", EMAIL_COACH_ALFA, coachRole,
                null, PHONE_COACH_ALFA, null, null, true, hash);
        AppUser coachBeta = saveUser(users, "Test Tranare Beta", EMAIL_COACH_BETA, coachRole,
                null, PHONE_COACH_BETA, null, null, true, hash);
        AppUser parentAlfa = saveUser(users, NAME_PARENT_ALFA, EMAIL_PARENT_ALFA, parentRole,
                null, PHONE_PARENT_ALFA, null, null, true, hash);
        AppUser parentBeta = saveUser(users, "Test Foralder Beta", EMAIL_PARENT_BETA, parentRole,
                null, PHONE_PARENT_BETA, null, null, true, hash);
        AppUser playerAlfa = saveUser(users, NAME_PLAYER_ALFA, EMAIL_PLAYER_ALFA, playerRole,
                SHIRT_ALFA, PHONE_PLAYER_ALFA, parentAlfa.getId(), alfa.getId(), true, hash);
        AppUser playerBeta = saveUser(users, NAME_PLAYER_BETA, EMAIL_PLAYER_BETA, playerRole,
                SHIRT_BETA, PHONE_PLAYER_BETA, parentBeta.getId(), beta.getId(), true, hash);
        AppUser extra = saveUser(users, "Test Spelare Extra", EMAIL_EXTRA, playerRole,
                33, PHONE_EXTRA, parentAlfa.getId(), alfa.getId(), true, hash);
        AppUser inactive = saveUser(users, "Test Spelare Inaktiv", EMAIL_INACTIVE, playerRole,
                44, PHONE_INACTIVE, parentAlfa.getId(), alfa.getId(), false, hash);

        link(links, alfa.getId(), coachAlfa.getId());
        link(links, beta.getId(), coachBeta.getId());

        Training trainingAlfa = saveTraining(trainings, alfa.getId(), coachAlfa.getId(), "Testtraning Alfa");
        Training trainingBeta = saveTraining(trainings, beta.getId(), coachBeta.getId(), "Testtraning Beta");
        mark(attendance, trainingAlfa.getId(), playerAlfa.getId());
        mark(attendance, trainingBeta.getId(), playerBeta.getId());

        Match matchAlfa = saveMatch(
                matches, alfa.getId(), coachAlfa.getId(), OPPONENT_ALFA, VENUE_ALFA, HomeAway.HOME, null, null);
        Match matchBeta = saveMatch(
                matches, beta.getId(), coachBeta.getId(), OPPONENT_BETA, VENUE_BETA, HomeAway.AWAY, 1, 0);

        return new ClubWorld(
                alfa.getId(),
                beta.getId(),
                admin.getId(),
                chairman.getId(),
                coachAlfa.getId(),
                coachBeta.getId(),
                playerAlfa.getId(),
                playerBeta.getId(),
                extra.getId(),
                inactive.getId(),
                parentAlfa.getId(),
                parentBeta.getId(),
                trainingAlfa.getId(),
                matchAlfa.getId(),
                matchBeta.getId(),
                jwt.createToken(admin.getId(), admin.getEmail(), "ADMIN"),
                jwt.createToken(chairman.getId(), chairman.getEmail(), "CHAIRMAN"),
                jwt.createToken(coachAlfa.getId(), coachAlfa.getEmail(), "COACH"),
                jwt.createToken(coachBeta.getId(), coachBeta.getEmail(), "COACH"),
                jwt.createToken(playerAlfa.getId(), playerAlfa.getEmail(), "PLAYER"),
                jwt.createToken(parentAlfa.getId(), parentAlfa.getEmail(), "PARENT"),
                jwt.createToken(parentBeta.getId(), parentBeta.getEmail(), "PARENT"),
                jwt.createToken(inactive.getId(), inactive.getEmail(), "PLAYER"));
    }

    private static long requiredRole(RoleRepository roles, String name) {
        return roles.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Missing role " + name + ". RoleSeeder should have inserted it."))
                .getId();
    }

    private static Team saveTeam(TeamRepository teams, String name) {
        Team team = new Team();
        team.setName(name);
        return teams.save(team);
    }

    private static void link(TeamCoachRepository links, Long teamId, Long userId) {
        TeamCoach link = new TeamCoach();
        link.setTeamId(teamId);
        link.setUserId(userId);
        links.save(link);
    }

    private static Training saveTraining(TrainingRepository trainings, Long teamId, Long coachId, String title) {
        Training training = new Training();
        training.setTeamId(teamId);
        training.setStartsAt(LocalDateTime.of(2026, 11, 6, 18, 0));
        training.setEndsAt(LocalDateTime.of(2026, 11, 6, 19, 30));
        training.setTitle(title);
        training.setCreatedByUserId(coachId);
        return trainings.save(training);
    }

    private static Match saveMatch(
            MatchRepository matches,
            Long teamId,
            Long coachId,
            String opponent,
            String venue,
            HomeAway homeAway,
            Integer goalsFor,
            Integer goalsAgainst) {
        Match match = new Match();
        match.setTeamId(teamId);
        match.setOpponent(opponent);
        match.setKickoffAt(LocalDateTime.of(2026, 12, 12, 14, 0));
        match.setVenue(venue);
        match.setHomeAway(homeAway);
        match.setGoalsFor(goalsFor);
        match.setGoalsAgainst(goalsAgainst);
        match.setCreatedByUserId(coachId);
        return matches.save(match);
    }

    private static void mark(TrainingAttendanceRepository attendance, Long trainingId, Long playerId) {
        TrainingAttendance row = new TrainingAttendance();
        row.setTrainingId(trainingId);
        row.setPlayerUserId(playerId);
        row.setStatus(AttendanceStatus.PRESENT);
        attendance.save(row);
    }

    private static AppUser saveUser(
            UserRepository users,
            String name,
            String email,
            long roleId,
            Integer shirt,
            String phone,
            Long parentId,
            Long teamId,
            boolean active,
            String passwordHash) {
        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(roleId);
        user.setPlayerNumber(shirt);
        user.setMobilePhoneNumber(phone);
        user.setParentId(parentId);
        user.setTeamId(teamId);
        user.setActive(active);
        user.setPasswordHash(passwordHash);
        user.setMustChangePassword(true);
        return users.save(user);
    }
}
