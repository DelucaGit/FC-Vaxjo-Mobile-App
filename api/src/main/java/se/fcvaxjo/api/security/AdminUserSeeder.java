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
 * Optionally creates the first ADMIN user.
 * Only runs when fcvaxjo.admin.seed=true and a password is provided via env.
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
        if (!properties.admin().seed()) {
            log.info("Admin seeding is disabled (fcvaxjo.admin.seed=false).");
            return;
        }

        String password = properties.admin().password();
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "ADMIN_SEED=true but ADMIN_PASSWORD is missing. Set ADMIN_PASSWORD in your environment."
            );
        }
        if (password.length() < 8) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least 8 characters.");
        }

        String email = properties.admin().email();
        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setFirstName(properties.admin().firstName());
        admin.setLastName(properties.admin().lastName());
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);

        userRepository.save(admin);
        log.info("Created admin user from environment config: {}", email);
    }
}
