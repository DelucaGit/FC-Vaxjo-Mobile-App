package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.TeamCoach;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TeamRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamCoachRepository teamCoachRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private TeamService teamService;

    @Test
    void addCoach_rejectsNonCoach() {
        Team team = new Team();
        team.setId(1L);
        team.setName("P15");

        AppUser parent = new AppUser();
        parent.setId(5L);
        parent.setRoleId(4L);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(5L)).thenReturn(Optional.of(parent));
        when(userService.getRoleName(4L)).thenReturn("PARENT");

        assertThrows(BadRequestException.class, () -> teamService.addCoach(1L, 5L));
    }

    @Test
    void addCoach_linksCoachToTeam() {
        Team team = new Team();
        team.setId(1L);
        team.setName("P15");

        AppUser coach = new AppUser();
        coach.setId(5L);
        coach.setRoleId(2L);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(5L)).thenReturn(Optional.of(coach));
        when(userService.getRoleName(2L)).thenReturn("COACH");
        when(teamCoachRepository.existsByTeamIdAndUserId(1L, 5L)).thenReturn(false);
        when(teamCoachRepository.save(any(TeamCoach.class))).thenAnswer(invocation -> {
            TeamCoach saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        TeamCoach link = teamService.addCoach(1L, 5L);

        assertEquals(1L, link.getTeamId());
        assertEquals(5L, link.getUserId());
    }

    @Test
    void createTeam_rejectsBlankName() {
        assertThrows(BadRequestException.class, () -> teamService.createTeam("  "));
    }
}
