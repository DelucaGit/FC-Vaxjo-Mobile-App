package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.HomeAway;
import se.fcvaxjo.api.model.Match;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TeamCoachRepository;

@ExtendWith(MockitoExtension.class)
class MatchServiceTest {

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private TeamService teamService;

    @Mock
    private TeamCoachRepository teamCoachRepository;

    @InjectMocks
    private MatchService matchService;

    @BeforeEach
    void setCoachAuth() {
        setAuth(5L, "COACH");
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void coach_missingMatch_isForbiddenAndDoesNotSayTheIdIsFree() {
        when(matchRepository.findById(99L)).thenReturn(Optional.empty());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> matchService.getById(99L));

        assertEquals(MatchService.MANAGE_DENIED, ex.getMessage());
    }

    @Test
    void coach_otherTeam_isTheSameForbiddenAnswer() {
        Match match = matchOnTeam(40L, 2L);
        when(matchRepository.findById(40L)).thenReturn(Optional.of(match));
        when(teamCoachRepository.existsByTeamIdAndUserId(2L, 5L)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> matchService.getById(40L));

        assertEquals(MatchService.MANAGE_DENIED, ex.getMessage());
    }

    @Test
    void admin_missingMatch_isNotFound() {
        setAuth(1L, "ADMIN");
        when(matchRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> matchService.getById(99L));
    }

    @Test
    void create_withoutScore_leavesTheResultEmpty() {
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 5L)).thenReturn(true);
        Team team = new Team();
        team.setId(10L);
        when(teamService.getTeamById(10L)).thenReturn(team);
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Match created = matchService.createMatch(
                10L,
                "  IFK Demo  ",
                LocalDateTime.of(2026, 12, 1, 14, 0),
                "  Tipshallen ",
                "home",
                null,
                null);

        assertEquals("IFK Demo", created.getOpponent());
        assertEquals("Tipshallen", created.getVenue());
        assertEquals(HomeAway.HOME, created.getHomeAway());
        assertNull(created.getGoalsFor());
        assertNull(created.getGoalsAgainst());
        assertEquals(5L, created.getCreatedByUserId());
    }

    @Test
    void create_withOnlyOneScore_isRejected() {
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 5L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> matchService.createMatch(
                10L, "IFK Demo", LocalDateTime.of(2026, 12, 1, 14, 0), "Tipshallen", "HOME", 1, null));
        verify(matchRepository, never()).save(any());
    }

    @Test
    void setResult_rejectsANegativeScore() {
        Match match = matchOnTeam(40L, 10L);
        when(matchRepository.findById(40L)).thenReturn(Optional.of(match));
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 5L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> matchService.setResult(40L, -1, 0));
        verify(matchRepository, never()).save(any());
    }

    @Test
    void setResult_withBothScoresEmpty_clearsTheResult() {
        Match match = matchOnTeam(40L, 10L);
        match.setGoalsFor(2);
        match.setGoalsAgainst(1);
        when(matchRepository.findById(40L)).thenReturn(Optional.of(match));
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 5L)).thenReturn(true);
        when(matchRepository.save(any(Match.class))).thenAnswer(call -> call.getArgument(0));

        Match saved = matchService.setResult(40L, null, null);

        assertNull(saved.getGoalsFor());
        assertNull(saved.getGoalsAgainst());
    }

    @Test
    void setResult_withOnlyOneScore_isRejected() {
        Match match = matchOnTeam(40L, 10L);
        when(matchRepository.findById(40L)).thenReturn(Optional.of(match));
        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 5L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> matchService.setResult(40L, null, 3));
        verify(matchRepository, never()).save(any());
    }

    private void setAuth(long userId, String roleName) {
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private Match matchOnTeam(long id, long teamId) {
        Match match = new Match();
        match.setId(id);
        match.setTeamId(teamId);
        match.setOpponent("Old");
        match.setKickoffAt(LocalDateTime.of(2026, 12, 1, 14, 0));
        match.setVenue("Pitch");
        match.setHomeAway(HomeAway.AWAY);
        match.setCreatedByUserId(5L);
        return match;
    }
}
