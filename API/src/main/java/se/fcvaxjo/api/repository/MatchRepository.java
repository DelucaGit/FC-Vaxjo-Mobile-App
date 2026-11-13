package se.fcvaxjo.api.repository;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.service.ActivityWhen;

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

    /**
     * One team's matches for the ?when= filter (issue #116).
     * null: all, newest first. UPCOMING: from the start of today, soonest first.
     * PAST: before the start of today, newest first.
     * A default method, so Spring does not try to build a query from its name.
     */
    default List<Match> listForTeam(Long teamId, ActivityWhen when, Clock clock) {
        if (when == null) {
            return findByTeamIdOrderByKickoffAtDesc(teamId);
        }
        LocalDateTime startOfToday = ActivityWhen.startOfToday(clock);
        return switch (when) {
            case UPCOMING -> findByTeamIdAndKickoffAtGreaterThanEqualOrderByKickoffAtAsc(teamId, startOfToday);
            case PAST -> findByTeamIdAndKickoffAtBeforeOrderByKickoffAtDesc(teamId, startOfToday);
        };
    }
}
