package se.fcvaxjo.api.repository;

import java.util.List;
import java.util.Optional;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    /** Partial name match, ignore case. Several rows can match. */
    List<AppUser> findByNameContainingIgnoreCase(String name);

    /** Exact shirt number. Unique, so at most one row. */
    Optional<AppUser> findByPlayerNumber(Integer playerNumber);
}
