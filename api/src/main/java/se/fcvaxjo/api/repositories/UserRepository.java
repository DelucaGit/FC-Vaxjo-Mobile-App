package se.fcvaxjo.api.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.models.User;

/**
 * Database access for User.
 * Spring Data creates the SQL for us from method names.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
}
