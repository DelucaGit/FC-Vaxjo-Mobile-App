package se.fcvaxjo.api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.models.Team;

/**
 * Database access for Team.
 */
public interface TeamRepository extends JpaRepository<Team, Long> {
}
