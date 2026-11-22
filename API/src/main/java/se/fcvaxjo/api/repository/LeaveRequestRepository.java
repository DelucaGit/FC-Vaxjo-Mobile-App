package se.fcvaxjo.api.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.LeaveRequest;
import se.fcvaxjo.api.model.LeaveRequestStatus;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    boolean existsByPlayerUserIdAndTrainingId(Long playerUserId, Long trainingId);

    boolean existsByPlayerUserIdAndMatchId(Long playerUserId, Long matchId);

    List<LeaveRequest> findByPlayerUserIdInOrderByCreatedAtDescIdDesc(Collection<Long> playerUserIds);

    List<LeaveRequest> findAllByOrderByCreatedAtDescIdDesc();

    boolean existsByPlayerUserIdAndTrainingIdAndStatus(
            Long playerUserId, Long trainingId, LeaveRequestStatus status);

    boolean existsByPlayerUserIdAndMatchIdAndStatus(
            Long playerUserId, Long matchId, LeaveRequestStatus status);
}
