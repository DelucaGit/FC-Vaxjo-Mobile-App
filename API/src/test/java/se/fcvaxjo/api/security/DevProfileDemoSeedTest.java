package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.autoconfigure.JpaProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.service.DemoClubSeeder;

/**
 * Local start with SPRING_PROFILES_ACTIVE=dev must create the demo club.
 * H2 stands in for PostgreSQL. application-dev.properties only turns SQL logging on,
 * so the datasource override does not hide a missing seeder.
 */
@SpringBootTest(properties = {
                "spring.datasource.url=jdbc:h2:mem:fcvaxjo_devseed;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "app.jwt.secret=test-only-jwt-secret-not-for-production-0000000000",
                "app.seed.admin-password=test-only-admin-password",
                "app.seed.demo-password=test-only-demo-password"
        })
@ActiveProfiles("dev")
class DevProfileDemoSeedTest {

    @Autowired
    private Environment environment;

    @Autowired
    private JpaProperties jpaProperties;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private TeamRepository teams;

    @Autowired
    private UserRepository users;

    @Autowired
    private TrainingRepository trainings;

    @Autowired
    private DemoClubSeeder seeder;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void devProfileIsActiveAndSqlLoggingIsOn() {
        assertTrue(List.of(environment.getActiveProfiles()).contains("dev"));
        assertEquals("true", environment.getProperty("spring.jpa.show-sql"));
        assertTrue(jpaProperties.isShowSql());
    }

    @Test
    void demoSeederRunsAndPlantsTheClub() {
        assertEquals(1, applicationContext.getBeanNamesForType(DemoClubSeeder.class).length);

        Team p13 = teams.findByName("P13").orElseThrow();
        assertTrue(teams.findByName("P14").isPresent());
        assertTrue(teams.findByName("P15").isPresent());
        assertTrue(users.findByEmail("coach.p13@demo.fcvaxjo.se").isPresent());
        assertTrue(users.findByEmail("player10.p13@demo.fcvaxjo.se").isPresent());
        assertTrue(users.findByEmail("parent1.p13@demo.fcvaxjo.se").isPresent());
        assertEquals(10, trainings.findByTeamIdOrderByStartsAtDesc(p13.getId()).size());
    }

    /**
     * A restart must not undo a password the developer changed. With
     * app.seed.reset-passwords=true the seeder goes back to DEMO_PASSWORD and
     * BOOTSTRAP_ADMIN_PASSWORD, and asks for a new password again.
     */
    @Test
    void restartKeepsChangedPasswordsUnlessResetIsOn() {
        List<String> emails = List.of(
                "admin@fcvaxjo.se",
                "coach.p13@demo.fcvaxjo.se",
                "player1.p13@demo.fcvaxjo.se",
                "parent1.p13@demo.fcvaxjo.se",
                "parent10.p13@demo.fcvaxjo.se");
        for (String email : emails) {
            AppUser user = users.findByEmail(email).orElseThrow();
            user.setPasswordHash("my-own-hash");
            user.setMustChangePassword(false);
            users.save(user);
        }

        seeder.run();

        for (String email : emails) {
            AppUser user = users.findByEmail(email).orElseThrow();
            assertEquals("my-own-hash", user.getPasswordHash(), email);
            assertFalse(user.isMustChangePassword(), email);
        }

        ReflectionTestUtils.setField(seeder, "resetPasswords", true);
        try {
            seeder.run();
        } finally {
            ReflectionTestUtils.setField(seeder, "resetPasswords", false);
        }

        for (String email : emails) {
            AppUser user = users.findByEmail(email).orElseThrow();
            String expected = email.startsWith("admin") ? "test-only-admin-password" : "test-only-demo-password";
            assertTrue(passwordEncoder.matches(expected, user.getPasswordHash()), email);
            assertTrue(user.isMustChangePassword(), email);
        }
    }
}
