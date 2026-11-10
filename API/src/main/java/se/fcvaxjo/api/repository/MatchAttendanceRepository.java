package se.fcvaxjo.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.MatchAttendance;

public interface MatchAttendanceRepository extends JpaRepository<MatchAttendance, Long> {

    List<MatchAttendance> findByMatchId(Long matchId);

    Optional<MatchAttendance> findByMatchIdAndPlayerUserId(Long matchId, Long playerUserId);
}
