package se.fcvaxjo.api.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import se.fcvaxjo.api.dto.CreateUserRequest;
import se.fcvaxjo.api.dto.UserResponse;
import se.fcvaxjo.api.models.User;
import se.fcvaxjo.api.repositories.UserRepository;

/**
 * Business logic for users.
 * Controllers call this class; this class talks to the database.
 */
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists: " + request.email());
        }

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        // Temporary: plain text. We will hash passwords in the security step.
        user.setPassword(request.password());
        user.setPhone(request.phone());
        user.setRole(request.role());

        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    public UserResponse findById(Long id) {
        return UserResponse.from(getUserOrThrow(id));
    }

    /** Used by other services when they need the real User entity. */
    public User getUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
    }
}
