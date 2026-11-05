package se.fcvaxjo.api.service;

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
 * Default password is temporary — change it after first login.
 * Documented in PROGRESS.md.
 */
@Component
@Order(2)
public class AdminSeeder implements CommandLineRunner {

    public static final String BOOTSTRAP_EMAIL = "admin@fcvaxjo.se";
    public static final String BOOTSTRAP_TEMP_PASSWORD = "TempAdmin1!";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(BOOTSTRAP_EMAIL).isPresent()) {
            return;
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role missing — RoleSeeder should run first"));

        AppUser admin = new AppUser();
        admin.setName("Club Admin");
        admin.setEmail(BOOTSTRAP_EMAIL);
        admin.setRoleId(adminRole.getId());
        admin.setActive(true);
        admin.setPasswordHash(passwordEncoder.encode(BOOTSTRAP_TEMP_PASSWORD));
        admin.setMustChangePassword(true);
        userRepository.save(admin);
    }
}
