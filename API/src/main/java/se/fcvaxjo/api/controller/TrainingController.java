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
import se.fcvaxjo.api.DTO.CreateTrainingRequest;
import se.fcvaxjo.api.DTO.TrainingResponse;
import se.fcvaxjo.api.DTO.UpdateAttendanceRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.service.TrainingService;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COACH')")
    public ResponseEntity<TrainingResponse> create(@RequestBody CreateTrainingRequest request) {
        Training created = trainingService.createTraining(
                request.getTeamId(),
                request.getStartsAt(),
                request.getEndsAt(),
                request.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COACH')")
    public List<TrainingResponse> listByTeam(@RequestParam Long teamId) {
        List<TrainingResponse> responses = new ArrayList<>();
        for (Training training : trainingService.listByTeam(teamId)) {
            responses.add(toResponse(training));
        }
        return responses;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COACH')")
    public TrainingResponse getById(@PathVariable Long id) {
        return toResponse(trainingService.getById(id));
    }

    @GetMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'COACH')")
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

    @PutMapping("/{id}/attendance/{playerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'COACH')")
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
                training.getTitle(),
                training.getCreatedByUserId());
    }
}
