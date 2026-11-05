package se.fcvaxjo.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Match;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByTeamIdOrderByKickoffAtDesc(Long teamId);
}
