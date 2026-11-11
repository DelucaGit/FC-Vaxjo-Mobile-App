package se.fcvaxjo.api.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.MatchResultResponse;
import se.fcvaxjo.api.DTO.MyChildResponse;
import se.fcvaxjo.api.DTO.MyCoachResponse;
import se.fcvaxjo.api.DTO.MyMatchResponse;
import se.fcvaxjo.api.DTO.MyTrainingResponse;
import se.fcvaxjo.api.DTO.TeamResponse;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.service.ActivityWhen;
import se.fcvaxjo.api.service.MyScheduleService;
import se.fcvaxjo.api.service.MyScheduleService.ScheduleRow;
import se.fcvaxjo.api.service.TeamService;

@RestController
@RequestMapping("/api/my")
public class MyScheduleController {

    private final MyScheduleService myScheduleService;
    private final TeamService teamService;

    public MyScheduleController(MyScheduleService myScheduleService, TeamService teamService) {
        this.myScheduleService = myScheduleService;
        this.teamService = teamService;
    }

    /** COACH: teams linked in team_coaches. ADMIN: all teams. */
    @GetMapping("/teams")
    @PreAuthorize("hasAnyRole('COACH', 'ADMIN')")
    public List<TeamResponse> listMyTeams() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId)) {
            throw new AccessDeniedException("Not logged in");
        }
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        List<Team> teams = isAdmin
                ? teamService.getAllTeams()
                : teamService.listTeamsForCoach(userId);

        List<TeamResponse> responses = new ArrayList<>();
        for (Team team : teams) {
            responses.add(new TeamResponse(team.getId(), team.getName()));
        }
        return responses;
    }

    @GetMapping("/children")
    @PreAuthorize("hasRole('PARENT')")
    public List<MyChildResponse> listChildren() {
        List<MyChildResponse> responses = new ArrayList<>();
        for (AppUser child : myScheduleService.listMyChildren()) {
            responses.add(new MyChildResponse(
                    child.getId(),
                    child.getName(),
                    child.getTeamId(),
                    myScheduleService.getTeamName(child.getTeamId())));
        }
        return responses;
    }

    @GetMapping("/trainings")
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public List<MyTrainingResponse> listTrainings(
            @RequestParam(required = false) Long childId,
            @RequestParam(required = false) String when) {
        List<MyTrainingResponse> responses = new ArrayList<>();
        for (ScheduleRow row : myScheduleService.listMyTrainings(childId, ActivityWhen.parse(when))) {
            Training t = row.training();
            AppUser player = row.player();
            responses.add(new MyTrainingResponse(
                    t.getId(),
                    t.getTeamId(),
                    myScheduleService.getTeamName(t.getTeamId()),
                    t.getStartsAt(),
                    t.getEndsAt(),
                    t.typeOrFootball().name(),
                    t.getVenue(),
                    player.getId(),
                    player.getName(),
                    row.status(),
                    t.statusOrScheduled().name(),
                    t.getCancelReason(),
                    t.getAttendanceLockedAt()));
        }
        return responses;
    }

    /**
     * PLAYER: matches for their own team. PARENT: must pass childId of a linked child.
     * The body has no email and no phone.
     */
    @GetMapping("/matches")
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public List<MyMatchResponse> listMatches(
            @RequestParam(required = false) Long childId,
            @RequestParam(required = false) String when) {
        List<MyMatchResponse> responses = new ArrayList<>();
        for (Match match : myScheduleService.listMyMatches(childId, ActivityWhen.parse(when))) {
            responses.add(new MyMatchResponse(
                    match.getId(),
                    match.getTeamId(),
                    myScheduleService.getTeamName(match.getTeamId()),
                    match.getOpponent(),
                    match.getKickoffAt(),
                    match.getVenue(),
                    match.getHomeAway().name(),
                    resultOf(match),
                    match.getAttendanceLockedAt()));
        }
        return responses;
    }

    /**
     * PLAYER: coaches of their own team. PARENT: must pass childId of a linked child.
     * Only name, email and phone, so the family can reach the coach (ADR 0009).
     */
    @GetMapping("/coaches")
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public List<MyCoachResponse> listCoaches(@RequestParam(required = false) Long childId) {
        List<MyCoachResponse> responses = new ArrayList<>();
        for (AppUser coach : myScheduleService.listMyCoaches(childId)) {
            responses.add(new MyCoachResponse(
                    coach.getId(),
                    coach.getName(),
                    coach.getEmail(),
                    coach.getMobilePhoneNumber()));
        }
        return responses;
    }

    private MatchResultResponse resultOf(Match match) {
        if (match.getGoalsFor() == null && match.getGoalsAgainst() == null) {
            return null;
        }
        return new MatchResultResponse(match.getGoalsFor(), match.getGoalsAgainst());
    }
}
