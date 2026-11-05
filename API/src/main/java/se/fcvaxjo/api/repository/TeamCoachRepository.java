package se.fcvaxjo.api.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.TeamCoach;

public interface TeamCoachRepository extends JpaRepository<TeamCoach, Long> {

    List<TeamCoach> findByTeamId(Long teamId);

    List<TeamCoach> findByUserId(Long userId);

    Optional<TeamCoach> findByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    /** Every coach link on these teams. The ids are bound as parameters. */
    List<TeamCoach> findByTeamIdIn(Collection<Long> teamIds);

    /** True when this user is a coach on one of these teams. */
    boolean existsByTeamIdInAndUserId(Collection<Long> teamIds, Long userId);
}