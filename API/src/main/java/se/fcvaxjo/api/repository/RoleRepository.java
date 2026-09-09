package se.fcvaxjo.api.repository;
import java.util.Optional;
import se.fcvaxjo.api.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
/**
 * RoleRepository
 */
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);
}