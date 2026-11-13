package se.fcvaxjo.api.repository;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.service.ActivityWhen;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    List<Training> findByTeamIdOrderByStartsAtDesc(Long teamId);

    List<Training> findByTeamIdAndStartsAtGreaterThanEqualOrderByStartsAtAsc(
            Long teamId, LocalDateTime from);

    List<Training> findByTeamIdAndStartsAtBeforeOrderByStartsAtDesc(
            Long teamId, LocalDateTime before);

    /**
     * One team's trainings for the ?when= filter (issue #116).
     * null: all, newest first. UPCOMING: from the start of today, soonest first.
     * PAST: before the start of today, newest first.
     * A default method, so Spring does not try to build a query from its name.
     */
    default List<Training> listForTeam(Long teamId, ActivityWhen when, Clock clock) {
        if (when == null) {
            return findByTeamIdOrderByStartsAtDesc(teamId);
        }
        LocalDateTime startOfToday = ActivityWhen.startOfToday(clock);
        return switch (when) {
            case UPCOMING -> findByTeamIdAndStartsAtGreaterThanEqualOrderByStartsAtAsc(teamId, startOfToday);
            case PAST -> findByTeamIdAndStartsAtBeforeOrderByStartsAtDesc(teamId, startOfToday);
        };
    }
}
