package se.fcvaxjo.api.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.models.Player;

/**
 * Database access for Player.
 */
public interface PlayerRepository extends JpaRepository<Player, Long> {

    /** All players on one team. */
    List<Player> findByTeamId(Long teamId);
}
