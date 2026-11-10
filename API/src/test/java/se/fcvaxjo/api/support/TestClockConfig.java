package se.fcvaxjo.api.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Swaps the real clock for {@link TestClock} in the HTTP tests.
 * {@code @Primary} wins over the production {@code Clock} bean, so code that
 * asks for a {@code Clock} gets this one.
 */
@TestConfiguration
public class TestClockConfig {

    @Bean
    @Primary
    public TestClock testClock() {
        return new TestClock();
    }
}
