package se.fcvaxjo.api.service;

import org.springframework.stereotype.Service;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public AppUser createUser(String name, String email, String roleName) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("User already exists");
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("This role does not exist"));

        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setRoleId(role.getId());
        return userRepository.save(user);
    }

    public AppUser getUserById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public AppUser changeUserRole(Long id, String roleName) {
        AppUser user = getUserById(id);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("This role does not exist"));
        user.setRoleId(role.getId());
        return userRepository.save(user);
    }
}
