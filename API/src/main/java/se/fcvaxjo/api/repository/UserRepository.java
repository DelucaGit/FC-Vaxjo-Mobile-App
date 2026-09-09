package se.fcvaxjo.api.repository;
import java.util.Optional;
import se.fcvaxjo.api.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
