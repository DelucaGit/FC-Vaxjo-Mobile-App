package se.fcvaxjo.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import se.fcvaxjo.api.security.FcvaxjoProperties;

@SpringBootApplication
@EnableConfigurationProperties(FcvaxjoProperties.class)
public class ApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}

}
