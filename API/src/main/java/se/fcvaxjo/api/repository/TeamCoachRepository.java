package se.fcvaxjo.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.TeamCoach;

public interface TeamCoachRepository extends JpaRepository<TeamCoach, Long> {

    List<TeamCoach> findByTeamId(Long teamId);

    Optional<TeamCoach> findByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
}