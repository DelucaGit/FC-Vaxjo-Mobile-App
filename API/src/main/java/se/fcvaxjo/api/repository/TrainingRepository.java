package se.fcvaxjo.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.Training;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    List<Training> findByTeamIdOrderByStartsAtDesc(Long teamId);
}
