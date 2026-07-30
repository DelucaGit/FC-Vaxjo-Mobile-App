package se.fcvaxjo.api.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.User;
import se.fcvaxjo.api.repositories.UserRepository;

/**
 * Creates the first ADMIN user on startup if it does not exist.
 * Useful for local learning so you can log in immediately.
 */
@Component
public class AdminUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FcvaxjoProperties properties;

    public AdminUserSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            FcvaxjoProperties properties
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = properties.admin().email();

        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setFirstName(properties.admin().firstName());
        admin.setLastName(properties.admin().lastName());
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(properties.admin().password()));
        admin.setRole(Role.ADMIN);

        userRepository.save(admin);
        log.info("Created local admin user: {}", email);
    }
}
