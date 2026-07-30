package se.fcvaxjo.api.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import se.fcvaxjo.api.dto.CreateTeamRequest;
import se.fcvaxjo.api.dto.TeamResponse;
import se.fcvaxjo.api.models.Role;
import se.fcvaxjo.api.models.Team;
import se.fcvaxjo.api.models.User;
import se.fcvaxjo.api.repositories.TeamRepository;

/**
 * Business logic for teams and assigning coaches.
 *
 * @Transactional keeps the database session open while we read coach lists.
 */
@Service
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserService userService;

    public TeamService(TeamRepository teamRepository, UserService userService) {
        this.teamRepository = teamRepository;
        this.userService = userService;
    }

    @Transactional
    public TeamResponse create(CreateTeamRequest request) {
        Team team = new Team();
        team.setName(request.name());
        team.setAgeGroup(request.ageGroup());
        team.setSeason(request.season());

        Team saved = teamRepository.save(team);
        return TeamResponse.from(saved);
    }

    public List<TeamResponse> findAll() {
        return teamRepository.findAll().stream()
                .map(TeamResponse::from)
                .toList();
    }

    public TeamResponse findById(Long id) {
        return TeamResponse.from(getTeamOrThrow(id));
    }

    @Transactional
    public TeamResponse addCoach(Long teamId, Long coachUserId) {
        Team team = getTeamOrThrow(teamId);
        User coach = userService.getUserOrThrow(coachUserId);

        if (coach.getRole() != Role.COACH && coach.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "User must have role COACH or ADMIN to be assigned as coach"
            );
        }

        boolean alreadyOnTeam = team.getCoaches().stream()
                .anyMatch(existing -> existing.getId().equals(coach.getId()));

        if (!alreadyOnTeam) {
            team.getCoaches().add(coach);
            teamRepository.save(team);
        }

        return TeamResponse.from(team);
    }

    public Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found: " + id));
    }
}
