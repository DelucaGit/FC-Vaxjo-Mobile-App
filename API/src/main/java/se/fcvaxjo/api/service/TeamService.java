package se.fcvaxjo.api.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamCoachRepository teamCoachRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public TeamService(
            TeamRepository teamRepository,
            TeamCoachRepository teamCoachRepository,
            UserRepository userRepository,
            UserService userService) {
        this.teamRepository = teamRepository;
        this.teamCoachRepository = teamCoachRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public Team createTeam(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Team name is required");
        }
        String trimmed = name.trim();
        if (teamRepository.findByName(trimmed).isPresent()) {
            throw new BadRequestException("Team already exists");
        }
        Team team = new Team();
        team.setName(trimmed);
        return teamRepository.save(team);
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Team getTeamById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Team not found"));
    }

    public String getTeamName(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return teamRepository.findById(teamId)
                .map(Team::getName)
                .orElse(null);
    }

    @Transactional
    public TeamCoach addCoach(Long teamId, Long userId) {
        getTeamById(teamId);

        if (userId == null) {
            throw new BadRequestException("userId is required");
        }

        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String roleName = userService.getRoleName(user.getRoleId());
        if (!"COACH".equals(roleName)) {
            throw new BadRequestException("Only a COACH can be added to a team");
        }

        if (teamCoachRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new BadRequestException("This coach is already on the team");
        }

        TeamCoach link = new TeamCoach();
        link.setTeamId(teamId);
        link.setUserId(userId);
        return teamCoachRepository.save(link);
    }

    public List<AppUser> listCoaches(Long teamId) {
        getTeamById(teamId);
        List<TeamCoach> links = teamCoachRepository.findByTeamId(teamId);
        List<AppUser> coaches = new ArrayList<>();
        for (TeamCoach link : links) {
            userRepository.findById(link.getUserId()).ifPresent(coaches::add);
        }
        return coaches;
    }

    @Transactional
    public void removeCoach(Long teamId, Long userId) {
        getTeamById(teamId);
        TeamCoach link = teamCoachRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Coach is not on this team"));
        teamCoachRepository.delete(link);
    }
}
