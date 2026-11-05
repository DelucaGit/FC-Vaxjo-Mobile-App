package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Profile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.service.DemoClubSeeder;

/**
 * Story S1-1 (gap analysis point 1) and point 5 are already fixed on this branch.
 * These tests guard that fix: the test profile must not plant a known password or the demo club.
 * Own in-memory database so it does not share rows with the role tests.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:fcvaxjo_safety;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class TestProfileSafetyTest {

    @Value("${app.seed.admin-password:}")
    private String adminSeed;

    @Value("${app.seed.demo-password:}")
    private String demoSeed;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Autowired
    private UserRepository users;

    @Autowired
    private TeamRepository teams;

    @Test
    void blankSeedPasswords_skipTheSeeders() {
        // AdminSeeder and DemoClubSeeder do nothing when the password value is empty.
        assertTrue(adminSeed == null || adminSeed.isBlank());
        assertTrue(demoSeed == null || demoSeed.isBlank());
    }

    @Test
    void demoSeeder_runsOnlyInTheDevProfile() {
        // Production must not recreate demo users. @Profile("dev") is what keeps it out.
        Profile profile = DemoClubSeeder.class.getAnnotation(Profile.class);
        assertTrue(profile != null && profile.value().length == 1);
        assertEquals("dev", profile.value()[0]);
    }

    @Test
    void startup_doesNotInsertBootstrapAdminOrDemoTeams() {
        assertTrue(users.findByEmail("admin@fcvaxjo.se").isEmpty());
        assertTrue(teams.findByName("P13").isEmpty());
        assertTrue(teams.findByName("P15").isEmpty());
        assertEquals(0, users.count());
    }

    @Test
    void tests_useTheInMemoryDatabaseAndALongSigningKey() {
        // Point 5: the app refuses to start when the signing key is missing or shorter than 32 bytes.
        assertTrue(jwtSecret.getBytes(StandardCharsets.UTF_8).length >= 32);
        assertTrue(jwtSecret.startsWith("test-only"));
        assertTrue(datasourceUrl.startsWith("jdbc:h2:mem:"));
    }
}
