package se.fcvaxjo.api.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Match;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByTeamIdOrderByKickoffAtDesc(Long teamId);

    /** Kickoff at or after the given time. Earliest first. Used by the public list. */
    List<Match> findByKickoffAtGreaterThanEqualOrderByKickoffAtAsc(LocalDateTime from);

    List<Match> findByTeamIdAndKickoffAtGreaterThanEqualOrderByKickoffAtAsc(
            Long teamId, LocalDateTime from);

    /** Kickoff before the given time. Latest first. Used by the public history. */
    List<Match> findByKickoffAtBeforeOrderByKickoffAtDesc(LocalDateTime before);

    List<Match> findByTeamIdAndKickoffAtBeforeOrderByKickoffAtDesc(
            Long teamId, LocalDateTime before);
}
