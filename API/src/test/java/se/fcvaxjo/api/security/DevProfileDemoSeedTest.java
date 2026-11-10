package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jpa.autoconfigure.JpaProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

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
}
