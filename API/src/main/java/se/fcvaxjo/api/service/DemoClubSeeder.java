package se.fcvaxjo.api.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.HomeAway;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Role;
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

/**
 * Local demo data for every team: 1 coach + up to 10 players (each with one parent)
 * + up to 10 trainings with attendance snapshots
 * + one upcoming home match and one away match that already has a score.
 * Idempotent per team. Resets bootstrap admin password for local login.
 * Only runs with the "dev" profile so production never gets demo users or known passwords.
 * Passwords come from DEMO_PASSWORD and BOOTSTRAP_ADMIN_PASSWORD (API/.env), never from code.
 * If DEMO_PASSWORD is not set, the whole demo seed is skipped.
 */
@Component
@Profile("dev")
@Order(3)
public class DemoClubSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoClubSeeder.class);
    private static final int PLAYERS_PER_TEAM = 10;
    private static final int TRAININGS_PER_TEAM = 10;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TeamRepository teamRepository;
    private final TeamCoachRepository teamCoachRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final MatchRepository matchRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;
    private final String demoPassword;
    private final String adminEmail;
    private final String adminPassword;

    public DemoClubSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            TeamRepository teamRepository,
            TeamCoachRepository teamCoachRepository,
            TrainingRepository trainingRepository,
            TrainingAttendanceRepository attendanceRepository,
            MatchRepository matchRepository,
            PasswordEncoder passwordEncoder,
            UserService userService,
            @Value("${app.seed.demo-password:}") String demoPassword,
            @Value("${app.seed.admin-email}") String adminEmail,
            @Value("${app.seed.admin-password:}") String adminPassword) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.teamRepository = teamRepository;
        this.teamCoachRepository = teamCoachRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.matchRepository = matchRepository;
        this.passwordEncoder = passwordEncoder;
        this.userService = userService;
        this.demoPassword = demoPassword;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (demoPassword == null || demoPassword.isBlank()) {
            log.warn("DEMO_PASSWORD is not set: skipping demo club seed.");
            return;
        }

        resetBootstrapAdminPassword();

        Role coachRole = requireRole("COACH");
        Role playerRole = requireRole("PLAYER");
        Role parentRole = requireRole("PARENT");

        ensureTeam("P13");
        ensureTeam("P14");
        ensureTeam("P15");

        for (Team team : teamRepository.findAll()) {
            seedTeam(team, coachRole, playerRole, parentRole);
        }
    }

    private void resetBootstrapAdminPassword() {
        if (adminPassword == null || adminPassword.isBlank()) {
            return;
        }
        userRepository.findByEmail(adminEmail).ifPresent(admin -> {
            PasswordChange.storeHash(admin, passwordEncoder.encode(adminPassword));
            admin.setMustChangePassword(true);
            userRepository.save(admin);
        });
    }

    private void seedTeam(
            Team team,
            Role coachRole,
            Role playerRole,
            Role parentRole) {
        String slug = team.getName().trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        if (slug.isBlank()) {
            slug = "team" + team.getId();
        }

        String coachEmail = "coach." + slug + "@demo.fcvaxjo.se";
        AppUser coach = saveUser(
                "Coach " + team.getName(),
                coachEmail,
                coachRole.getId(),
                null,
                "+46700" + (900 + team.getId().intValue()),
                null,
                null);

        if (!teamCoachRepository.existsByTeamIdAndUserId(team.getId(), coach.getId())) {
            TeamCoach link = new TeamCoach();
            link.setTeamId(team.getId());
            link.setUserId(coach.getId());
            teamCoachRepository.save(link);
        }

        int existingDemoPlayers = 0;
        for (AppUser user : userRepository.findByTeamIdAndActiveTrue(team.getId())) {
            if ("PLAYER".equals(userService.getRoleName(user.getRoleId()))
                    && user.getEmail() != null
                    && user.getEmail().endsWith("@demo.fcvaxjo.se")
                    && user.getEmail().startsWith("player")) {
                existingDemoPlayers++;
                // Keep demo logins in sync with DEMO_PASSWORD (older rows may still have an old password).
                resetDemoLogin(user);
                if (user.getParentId() != null) {
                    userRepository.findById(user.getParentId()).ifPresent(this::resetDemoLogin);
                }
            }
        }

        for (int i = existingDemoPlayers + 1; i <= PLAYERS_PER_TEAM; i++) {
            AppUser parent = saveUser(
                    "Parent " + team.getName() + " " + i,
                    "parent" + i + "." + slug + "@demo.fcvaxjo.se",
                    parentRole.getId(),
                    null,
                    "+4671" + (800 + team.getId().intValue()) + String.format("%02d", i),
                    null,
                    null);

            // teamId * 1000 + i keeps shirt numbers unique across teams
            int shirtNumber = team.getId().intValue() * 1000 + i;
            saveUser(
                    "Player " + team.getName() + " " + i,
                    "player" + i + "." + slug + "@demo.fcvaxjo.se",
                    playerRole.getId(),
                    shirtNumber,
                    "+4672" + (800 + team.getId().intValue()) + String.format("%02d", i),
                    parent.getId(),
                    team.getId());
        }

        seedTrainings(team, coach.getId());
        seedMatches(team, coach.getId());
    }

    /**
     * One home match still to be played, and one away match that already has a score.
     * Skipped when those two opponents are already stored for the team.
     */
    private void seedMatches(Team team, Long coachUserId) {
        List<Match> existing = matchRepository.findByTeamIdOrderByKickoffAtDesc(team.getId());
        boolean hasHome = false;
        boolean hasAway = false;
        for (Match match : existing) {
            if ("Home Demo".equals(match.getOpponent())) {
                hasHome = true;
            }
            if ("Away Demo".equals(match.getOpponent())) {
                hasAway = true;
            }
        }
        if (!hasHome) {
            saveDemoMatch(
                    team.getId(),
                    coachUserId,
                    "Home Demo",
                    LocalDateTime.now().plusDays(10).withHour(14).withMinute(0).withSecond(0).withNano(0),
                    "Home pitch",
                    HomeAway.HOME,
                    null,
                    null);
        }
        if (!hasAway) {
            saveDemoMatch(
                    team.getId(),
                    coachUserId,
                    "Away Demo",
                    LocalDateTime.now().minusDays(10).withHour(14).withMinute(0).withSecond(0).withNano(0),
                    "Away pitch",
                    HomeAway.AWAY,
                    2,
                    1);
        }
    }

    private void saveDemoMatch(
            Long teamId,
            Long coachUserId,
            String opponent,
            LocalDateTime kickoffAt,
            String venue,
            HomeAway homeAway,
            Integer goalsFor,
            Integer goalsAgainst) {
        Match match = new Match();
        match.setTeamId(teamId);
        match.setOpponent(opponent);
        match.setKickoffAt(kickoffAt);
        match.setVenue(venue);
        match.setHomeAway(homeAway);
        match.setGoalsFor(goalsFor);
        match.setGoalsAgainst(goalsAgainst);
        match.setCreatedByUserId(coachUserId);
        matchRepository.save(match);
    }

    /**
     * Creates trainings until the team has TRAININGS_PER_TEAM.
     * Each one snapshots current active players (status left empty for the coach to mark).
     */
    private void seedTrainings(Team team, Long coachUserId) {
        List<Training> existing = trainingRepository.findByTeamIdOrderByStartsAtDesc(team.getId());
        int already = existing.size();
        if (already >= TRAININGS_PER_TEAM) {
            return;
        }

        List<AppUser> players = listActivePlayers(team.getId());
        LocalDate firstDay = LocalDate.now().plusDays(1);

        for (int i = already + 1; i <= TRAININGS_PER_TEAM; i++) {
            LocalDateTime startsAt = LocalDateTime.of(firstDay.plusDays((i - 1) * 3L), LocalTime.of(18, 0));
            LocalDateTime endsAt = startsAt.plusMinutes(90);

            Training training = new Training();
            training.setTeamId(team.getId());
            training.setStartsAt(startsAt);
            training.setEndsAt(endsAt);
            training.setTitle("Training " + i);
            training.setCreatedByUserId(coachUserId);
            Training saved = trainingRepository.save(training);

            for (AppUser player : players) {
                TrainingAttendance row = new TrainingAttendance();
                row.setTrainingId(saved.getId());
                row.setPlayerUserId(player.getId());
                row.setStatus(null);
                attendanceRepository.save(row);
            }
        }
    }

    private List<AppUser> listActivePlayers(Long teamId) {
        List<AppUser> players = new ArrayList<>();
        for (AppUser user : userRepository.findByTeamIdAndActiveTrue(teamId)) {
            if ("PLAYER".equals(userService.getRoleName(user.getRoleId()))) {
                players.add(user);
            }
        }
        return players;
    }

    private void resetDemoLogin(AppUser user) {
        if (user.getEmail() == null || !user.getEmail().endsWith("@demo.fcvaxjo.se")) {
            return;
        }
        PasswordChange.storeHash(user, passwordEncoder.encode(demoPassword));
        user.setMustChangePassword(true);
        userRepository.save(user);
    }

        private AppUser saveUser(
            String name,
            String email,
            Long roleId,
            Integer playerNumber,
            String phone,
            Long parentId,
            Long teamId) {
        return userRepository.findByEmail(email).map(existing -> {
            // Keep demo logins working across restarts (password may have been changed).
            PasswordChange.storeHash(existing, passwordEncoder.encode(demoPassword));
            existing.setMustChangePassword(true);
            existing.setActive(true);
            if (teamId != null) {
                existing.setTeamId(teamId);
            }
            if (phone != null) {
                existing.setMobilePhoneNumber(phone);
            }
            return userRepository.save(existing);
        }).orElseGet(() -> {
            AppUser user = new AppUser();
            user.setName(name);
            user.setEmail(email);
            user.setRoleId(roleId);
            user.setPlayerNumber(playerNumber);
            user.setMobilePhoneNumber(phone);
            user.setParentId(parentId);
            user.setTeamId(teamId);
            user.setActive(true);
            PasswordChange.storeHash(user, passwordEncoder.encode(demoPassword));
            user.setMustChangePassword(true);
            return userRepository.save(user);
        });
    }

    private Team ensureTeam(String name) {
        return teamRepository.findByName(name).orElseGet(() -> {
            Team team = new Team();
            team.setName(name);
            return teamRepository.save(team);
        });
    }

    private Role requireRole(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Missing role " + name));
    }
}
