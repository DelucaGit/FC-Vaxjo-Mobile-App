package se.fcvaxjo.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.TrainingAttendance;

public interface TrainingAttendanceRepository extends JpaRepository<TrainingAttendance, Long> {

    List<TrainingAttendance> findByTrainingId(Long trainingId);

    Optional<TrainingAttendance> findByTrainingIdAndPlayerUserId(Long trainingId, Long playerUserId);
}
