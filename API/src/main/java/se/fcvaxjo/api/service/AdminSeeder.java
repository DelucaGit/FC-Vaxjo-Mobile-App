package se.fcvaxjo.api.service;

import java.time.Clock;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

/**
 * Ensures one bootstrap ADMIN exists so you can log in after enabling security.
 * The temporary password comes from BOOTSTRAP_ADMIN_PASSWORD (API/.env or Railway variables),
 * never from code. If it is not set, no admin is created. Change it after first login.
 */
@Component
@Order(2)
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapEmail;
    private final String bootstrapPassword;
    private final Clock clock;

    public AdminSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.admin-email}") String bootstrapEmail,
            @Value("${app.seed.admin-password:}") String bootstrapPassword,
            Clock clock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
        this.clock = clock;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(bootstrapEmail).isPresent()) {
            return;
        }
        if (bootstrapPassword == null || bootstrapPassword.isBlank()) {
            log.warn("BOOTSTRAP_ADMIN_PASSWORD is not set: skipping bootstrap admin creation.");
            return;
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role missing — RoleSeeder should run first"));

        AppUser admin = new AppUser();
        admin.setName("Club Admin");
        admin.setEmail(bootstrapEmail);
        admin.setRoleId(adminRole.getId());
        admin.setActive(true);
        admin.setMemberSince(LocalDate.now(clock));
        PasswordChange.storeHash(admin, passwordEncoder.encode(bootstrapPassword));
        admin.setMustChangePassword(true);
        userRepository.save(admin);
    }
}
