package se.fcvaxjo.api.repository;

import java.util.List;
import java.util.Optional;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    /** Partial name match, ignore case. Several rows can match. */
    List<AppUser> findByNameContainingIgnoreCase(String name);

    /** Active users only for name search in the app. */
    List<AppUser> findByNameContainingIgnoreCaseAndActiveTrue(String name);

    /** Exact shirt number. Unique, so at most one row. */
    Optional<AppUser> findByPlayerNumber(Integer playerNumber);

    /** Exact mobile phone. Unique when set, so at most one row. */
    Optional<AppUser> findByMobilePhoneNumber(String mobilePhoneNumber);

    /** Users that point at this team (players use this). */
    List<AppUser> findByTeamId(Long teamId);

    /** Active players/users on a team. */
    List<AppUser> findByTeamIdAndActiveTrue(Long teamId);

    List<AppUser> findByActiveTrue();
}
