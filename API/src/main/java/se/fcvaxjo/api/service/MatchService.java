package se.fcvaxjo.api.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.model.HomeAway;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;

/**
 * Staff matches. ADMIN and CHAIRMAN may write every team.
 * A coach may write only a team they are linked to in team_coaches.
 * A player or parent does not use these methods. They read /api/my/matches.
 */
@Service
public class MatchService {

    /**
     * One sentence for "not your team" and for "no such match" when the caller
     * is a coach. Two different texts would tell the coach that the id exists.
     */
    public static final String MANAGE_DENIED =
            "Only ADMIN, CHAIRMAN, or a coach of this team can manage matches";

    private final MatchRepository matchRepository;
    private final TeamService teamService;
    private final TeamCoachRepository teamCoachRepository;

    public MatchService(
            MatchRepository matchRepository,
            TeamService teamService,
            TeamCoachRepository teamCoachRepository) {
        this.matchRepository = matchRepository;
        this.teamService = teamService;
        this.teamCoachRepository = teamCoachRepository;
    }

    @Transactional
    public Match createMatch(
            Long teamId,
            String opponent,
            LocalDateTime kickoffAt,
            String venue,
            String homeAwayName,
            Integer goalsFor,
            Integer goalsAgainst) {
        assertCanManageTeam(teamId);

        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        if (opponent == null || opponent.isBlank()) {
            throw new BadRequestException("opponent is required");
        }
        if (kickoffAt == null) {
            throw new BadRequestException("kickoffAt is required");
        }
        if (venue == null || venue.isBlank()) {
            throw new BadRequestException("venue is required");
        }

        HomeAway homeAway = parseHomeAway(homeAwayName);
        assertScorePair(goalsFor, goalsAgainst);

        teamService.getTeamById(teamId);

        Match match = new Match();
        match.setTeamId(teamId);
        match.setOpponent(opponent.trim());
        match.setKickoffAt(kickoffAt);
        match.setVenue(venue.trim());
        match.setHomeAway(homeAway);
        match.setGoalsFor(goalsFor);
        match.setGoalsAgainst(goalsAgainst);
        match.setCreatedByUserId(currentUserId());
        return matchRepository.save(match);
    }

    public List<Match> listByTeam(Long teamId) {
        if (teamId == null) {
            throw new BadRequestException("teamId is required");
        }
        // Team check first, same as trainings. An unknown team is 403 for a coach.
        assertCanManageTeam(teamId);
        teamService.getTeamById(teamId);
        return matchRepository.findByTeamIdOrderByKickoffAtDesc(teamId);
    }

    /**
     * ADMIN and CHAIRMAN get 404 when the id is missing. They may see every team,
     * so 404 does not hide a match from them.
     * A coach gets the same 403 for a missing id and for another team's match.
     */
    public Match getById(Long id) {
        ClubRole role = currentClubRole();
        if (role != null && role.canManageAllMatches()) {
            return matchRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Match not found"));
        }
        if (role == ClubRole.COACH) {
            Match match = matchRepository.findById(id).orElse(null);
            if (match == null || !isCoachOfTeam(match.getTeamId())) {
                throw new AccessDeniedException(MANAGE_DENIED);
            }
            return match;
        }
        throw new AccessDeniedException(MANAGE_DENIED);
    }

    /**
     * Sets the score, or clears it when both numbers are null
     * (for a result that was typed in wrong). One number alone is 400.
     */
    @Transactional
    public Match setResult(Long id, Integer goalsFor, Integer goalsAgainst) {
        Match match = getById(id);
        assertScorePair(goalsFor, goalsAgainst);
        match.setGoalsFor(goalsFor);
        match.setGoalsAgainst(goalsAgainst);
        return matchRepository.save(match);
    }

    public String getTeamName(Long teamId) {
        return teamService.getTeamName(teamId);
    }

    /**
     * Both numbers empty means "no result" (on create, and to clear a result).
     * One number without the other is always rejected.
     */
    private void assertScorePair(Integer goalsFor, Integer goalsAgainst) {
        if (goalsFor == null && goalsAgainst == null) {
            return;
        }
        if (goalsFor == null || goalsAgainst == null) {
            throw new BadRequestException("goalsFor and goalsAgainst must both be set, or both left empty");
        }
        if (goalsFor < 0 || goalsAgainst < 0) {
            throw new BadRequestException("goalsFor and goalsAgainst cannot be negative");
        }
    }

    private HomeAway parseHomeAway(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("homeAway is required (HOME or AWAY)");
        }
        try {
            return HomeAway.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("homeAway must be HOME or AWAY");
        }
    }

    private void assertCanManageTeam(Long teamId) {
        ClubRole role = currentClubRole();
        if (role != null && role.canManageAllMatches()) {
            return;
        }
        if (role == ClubRole.COACH && isCoachOfTeam(teamId)) {
            return;
        }
        throw new AccessDeniedException(MANAGE_DENIED);
    }

    private boolean isCoachOfTeam(Long teamId) {
        if (teamId == null) {
            return false;
        }
        return teamCoachRepository.existsByTeamIdAndUserId(teamId, currentUserId());
    }

    /**
     * The token carries one club role (ADR 0006). Spring stores it as ROLE_NAME.
     * An unknown name is ignored so a bad token is not treated as a chairman.
     */
    private ClubRole currentClubRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return null;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            ClubRole role = clubRoleFromAuthority(authority.getAuthority());
            if (role != null) {
                return role;
            }
        }
        return null;
    }

    private ClubRole clubRoleFromAuthority(String authority) {
        if (authority == null || !authority.startsWith("ROLE_")) {
            return null;
        }
        String roleName = authority.substring("ROLE_".length());
        try {
            return ClubRole.valueOf(roleName);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new AccessDeniedException("Not logged in");
        }
        return id;
    }
}
