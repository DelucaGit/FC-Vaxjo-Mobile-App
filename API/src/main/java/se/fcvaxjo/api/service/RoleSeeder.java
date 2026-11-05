package se.fcvaxjo.api.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;

/**
 * Inserts every club role on startup when that name is missing.
 * The row id is not the rank. Rank lives in {@link ClubRole}.
 */
@Component
@Order(1)
public class RoleSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) {
        for (ClubRole role : ClubRole.values()) {
            seed(role.name());
        }
    }

    private void seed(String name) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = new Role();
            role.setName(name);
            roleRepository.save(role);
        }
    }
}