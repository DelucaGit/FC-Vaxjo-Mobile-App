package se.fcvaxjo.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Checks that the Spring app starts with the test profile (H2 in-memory DB).
 */
@SpringBootTest
@ActiveProfiles("test")
class ApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
