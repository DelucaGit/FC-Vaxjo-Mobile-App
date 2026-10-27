package se.fcvaxjo.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Team;

public interface TeamRepository extends JpaRepository<Team, Long> {

    Optional<Team> findByName(String name);
}
