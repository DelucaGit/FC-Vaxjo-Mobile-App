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
import se.fcvaxjo.api.DTO.CreateMatchRequest;
import se.fcvaxjo.api.DTO.MatchResponse;
import se.fcvaxjo.api.DTO.MatchResultResponse;
import se.fcvaxjo.api.DTO.SetMatchResultRequest;
import se.fcvaxjo.api.DTO.UpdateAttendanceRequest;
import se.fcvaxjo.api.DTO.UpdateMatchRequest;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.MatchAttendance;
import se.fcvaxjo.api.service.ActivityWhen;
import se.fcvaxjo.api.service.MatchService;

/**
 * Staff matches. ADMIN and CHAIRMAN manage every team
 * (ClubRole.canManageAllMatches).
 * COACH is allowed through the role check. MatchService then
 * limits a coach to teams in team_coaches.
 * A player or parent uses /api/my/matches instead of these URLs.
 */
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<MatchResponse> create(@RequestBody CreateMatchRequest request) {
        Match created = matchService.createMatch(
                request.getTeamId(),
                request.getOpponent(),
                request.getKickoffAt(),
                request.getVenue(),
                request.getHomeAway(),
                request.getGoalsFor(),
                request.getGoalsAgainst());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<MatchResponse> listByTeam(
            @RequestParam Long teamId,
            @RequestParam(required = false) String when) {
        List<MatchResponse> responses = new ArrayList<>();
        for (Match match : matchService.listByTeam(teamId, ActivityWhen.parse(when))) {
            responses.add(toResponse(match));
        }
        return responses;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public MatchResponse getById(@PathVariable Long id) {
        return toResponse(matchService.getById(id));
    }

    /** Edit a match (issue #127). The team cannot be changed. */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public MatchResponse update(@PathVariable Long id, @RequestBody UpdateMatchRequest request) {
        Match updated = matchService.updateMatch(
                id,
                request.getOpponent(),
                request.getKickoffAt(),
                request.getVenue(),
                request.getHomeAway());
        return toResponse(updated);
    }

    @PutMapping("/{id}/result")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public MatchResponse setResult(@PathVariable Long id, @RequestBody SetMatchResultRequest request) {
        Match updated = matchService.setResult(id, request.getGoalsFor(), request.getGoalsAgainst());
        return toResponse(updated);
    }

    /** Same JSON as training attendance (AttendanceResponse): no email, no phone. */
    @GetMapping("/{id}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<AttendanceResponse> listAttendance(@PathVariable Long id) {
        List<AttendanceResponse> responses = new ArrayList<>();
        for (MatchAttendance row : matchService.listAttendance(id)) {
            responses.add(toAttendanceResponse(row));
        }
        return responses;
    }

    /**
     * "Klar": freezes the attendance list. Same roles and team scope as marking.
     * Returns the match with attendanceLockedAt set. Calling it again is a no-op.
     */
    @PutMapping("/{id}/attendance/lock")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public MatchResponse lockAttendance(@PathVariable Long id) {
        return toResponse(matchService.lockAttendance(id));
    }

    @PutMapping("/{id}/attendance/{playerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public AttendanceResponse updateAttendance(
            @PathVariable Long id,
            @PathVariable Long playerId,
            @RequestBody UpdateAttendanceRequest request) {
        MatchAttendance updated = matchService.updateAttendance(id, playerId, request.getStatus());
        return toAttendanceResponse(updated);
    }

    private AttendanceResponse toAttendanceResponse(MatchAttendance row) {
        AppUser player = matchService.getPlayer(row.getPlayerUserId());
        String status = row.getStatus() == null ? null : row.getStatus().name();
        return new AttendanceResponse(player.getId(), player.getName(), player.getPlayerNumber(), status);
    }

    private MatchResponse toResponse(Match match) {
        return new MatchResponse(
                match.getId(),
                match.getTeamId(),
                matchService.getTeamName(match.getTeamId()),
                match.getOpponent(),
                match.getKickoffAt(),
                match.getVenue(),
                match.getHomeAway().name(),
                resultOf(match),
                match.getCreatedByUserId(),
                match.getAttendanceLockedAt());
    }

    /** Both score columns empty means the match has no result yet. */
    private MatchResultResponse resultOf(Match match) {
        if (match.getGoalsFor() == null && match.getGoalsAgainst() == null) {
            return null;
        }
        return new MatchResultResponse(match.getGoalsFor(), match.getGoalsAgainst());
    }
}
