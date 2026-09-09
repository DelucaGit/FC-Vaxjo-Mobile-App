package se.fcvaxjo.api.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;

@Component
public class RoleSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) {
        seed("ADMIN");
        seed("COACH");
        seed("PLAYER");
        seed("PARENT");
    }

    private void seed(String name) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = new Role();
            role.setName(name);
            roleRepository.save(role);
        }
    }
}