package se.fcvaxjo.api.repository;

import java.util.Optional;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);
}
