package se.fcvaxjo.api.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.LeaveRequest;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    boolean existsByPlayerUserIdAndTrainingId(Long playerUserId, Long trainingId);

    boolean existsByPlayerUserIdAndMatchId(Long playerUserId, Long matchId);

    List<LeaveRequest> findByPlayerUserIdInOrderByCreatedAtDescIdDesc(Collection<Long> playerUserIds);
}
