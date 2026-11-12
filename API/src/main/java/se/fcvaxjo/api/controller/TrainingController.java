package se.fcvaxjo.api.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.AttendanceResponse;
import se.fcvaxjo.api.DTO.CancelTrainingRequest;
import se.fcvaxjo.api.DTO.CreateTrainingRequest;
import se.fcvaxjo.api.DTO.CreateTrainingSeriesRequest;
import se.fcvaxjo.api.DTO.TrainingResponse;
import se.fcvaxjo.api.DTO.UpdateAttendanceRequest;
import se.fcvaxjo.api.DTO.UpdateTrainingRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.service.ActivityWhen;
import se.fcvaxjo.api.service.TrainingService;

/**
 * Staff trainings. ADMIN and CHAIRMAN manage every team
 * (ClubRole.canManageAllTrainings).
 * COACH is allowed through the role check. TrainingService then
 * limits a coach to teams in team_coaches.
 * A player or parent uses /api/my/trainings instead of these URLs.
 */
@RestController
@RequestMapping("/api/trainings")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<TrainingResponse> create(@RequestBody CreateTrainingRequest request) {
        Training created = trainingService.createTraining(
                request.getTeamId(),
                request.getStartsAt(),
                request.getEndsAt(),
                request.getType(),
                request.getVenue());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    /**
     * Creates many ordinary trainings in one call (issue #129). Same writers as create.
     * Returns only the trainings that were created; past dates are skipped.
     */
    @PostMapping("/series")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<List<TrainingResponse>> createSeries(
            @RequestBody CreateTrainingSeriesRequest request) {
        List<TrainingResponse> responses = new ArrayList<>();
        for (Training training : trainingService.createTrainingSeries(
                request.getTeamId(),
                request.getType(),
                request.getWeekdays(),
                request.getStartTime(),
                request.getEndTime(),
                request.getVenue(),
                request.getFromDate(),
                request.getToDate())) {
            responses.add(toResponse(training));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<TrainingResponse> listByTeam(
            @RequestParam Long teamId,
            @RequestParam(required = false) String when) {
        List<TrainingResponse> responses = new ArrayList<>();
        for (Training training : trainingService.listByTeam(teamId, ActivityWhen.parse(when))) {
            responses.add(toResponse(training));
        }
        return responses;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public TrainingResponse getById(@PathVariable Long id) {
        return toResponse(trainingService.getById(id));
    }

    /**
     * Changes time, place, and training type. Same writers as create.
     * The team is not part of the body, so the attendance list stays.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public TrainingResponse update(@PathVariable Long id, @RequestBody UpdateTrainingRequest request) {
        Training updated = trainingService.updateTraining(
                id,
                request.getStartsAt(),
                request.getEndsAt(),
                request.getType(),
                request.getVenue());
        return toResponse(updated);
    }

    /**
     * Calls the training off, or reactivates it with cancelled=false. The row is not deleted.
     * A missing cancelled means true, so older clients keep working. reason is optional.
     */
    @PutMapping("/{id}/cancellation")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public TrainingResponse cancel(@PathVariable Long id, @RequestBody CancelTrainingRequest request) {
        if (request != null && Boolean.FALSE.equals(request.getCancelled())) {
            return toResponse(trainingService.reactivateTraining(id));
        }
        String reason = request == null ? null : request.getReason();
        return toResponse(trainingService.cancelTraining(id, reason));
    }

    @GetMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<AttendanceResponse> listAttendance(@PathVariable Long id) {
        List<AttendanceResponse> responses = new ArrayList<>();
        for (TrainingAttendance row : trainingService.listAttendance(id)) {
            AppUser player = trainingService.getPlayer(row.getPlayerUserId());
            String status = row.getStatus() == null ? null : row.getStatus().name();
            responses.add(new AttendanceResponse(
                    player.getId(),
                    player.getName(),
                    player.getPlayerNumber(),
                    status));
        }
        return responses;
    }

    /**
     * "Klar": freezes the attendance list (issue #86). Same roles and team scope as marking.
     * Returns the training with attendanceLockedAt set. Calling it again is a no-op.
     */
    @PutMapping("/{id}/attendance/lock")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public TrainingResponse lockAttendance(@PathVariable Long id) {
        return toResponse(trainingService.lockAttendance(id));
    }

    @PutMapping("/{id}/attendance/{playerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public AttendanceResponse updateAttendance(
            @PathVariable Long id,
            @PathVariable Long playerId,
            @RequestBody UpdateAttendanceRequest request) {
        TrainingAttendance updated = trainingService.updateAttendance(id, playerId, request.getStatus());
        AppUser player = trainingService.getPlayer(updated.getPlayerUserId());
        return new AttendanceResponse(
                player.getId(),
                player.getName(),
                player.getPlayerNumber(),
                updated.getStatus().name());
    }

    private TrainingResponse toResponse(Training training) {
        return new TrainingResponse(
                training.getId(),
                training.getTeamId(),
                trainingService.getTeamName(training.getTeamId()),
                training.getStartsAt(),
                training.getEndsAt(),
                training.typeOrFootball().name(),
                training.getVenue(),
                training.statusOrScheduled().name(),
                training.getCancelReason(),
                training.getCreatedByUserId(),
                training.getAttendanceLockedAt());
    }
}
