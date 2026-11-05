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

import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.service.DemoClubSeeder;

/**
 * F9: a start with no SPRING_PROFILES_ACTIVE must stay on the base file.
 * This class has no @ActiveProfiles, so the test profile must not sneak in.
 * The datasource is in-memory H2 only so the check does not need PostgreSQL.
 * DEMO_PASSWORD is set on purpose: if the seeder bean existed, it would insert rows.
 */
@SpringBootTest(properties = {
                "spring.datasource.url=jdbc:h2:mem:fcvaxjo_noprofile;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "app.jwt.secret=test-only-jwt-secret-not-for-production-0000000000",
                "app.seed.admin-password=",
                "app.seed.demo-password=test-only-demo-password"
        })
class NoActiveProfileSafetyTest {

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

    @Test
    void noProfileIsActive() {
        assertEquals(0, environment.getActiveProfiles().length);
        assertFalse(List.of(environment.getActiveProfiles()).contains("dev"));
    }

    @Test
    void sqlLoggingStaysOff() {
        assertEquals("false", environment.getProperty("spring.jpa.show-sql"));
        assertFalse(jpaProperties.isShowSql());
    }

    @Test
    void demoSeederIsNotCreated() {
        assertEquals(0, applicationContext.getBeanNamesForType(DemoClubSeeder.class).length);
        assertTrue(teams.findByName("P13").isEmpty());
        assertTrue(users.findByEmail("coach.p13@demo.fcvaxjo.se").isEmpty());
    }
}
