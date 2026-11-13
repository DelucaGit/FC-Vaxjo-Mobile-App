package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
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
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.AttendanceStatus;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.model.TrainingType;
import se.fcvaxjo.api.repository.TeamCoachRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class TrainingServiceTest {

    @Mock
    private TrainingRepository trainingRepository;

    @Mock
    private TrainingAttendanceRepository attendanceRepository;

    @Mock
    private TeamService teamService;

    @Mock
    private TeamCoachRepository teamCoachRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TrainingAttendanceRoster roster;

    /** The past-start rule is tested over HTTP (ActivityStartInPastTest). */
    @Mock
    private ActivityStartRule startRule;

    @InjectMocks
    private TrainingService trainingService;

    @BeforeEach
    void setAdminAuth() {
        setAuth(1L, "ADMIN");
        // The clock rules are tested over HTTP. Here a training is never due for auto-freeze.
        lenient().when(roster.freezeIfDue(any(Training.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void setAuth(long userId, String roleName) {
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createTraining_doesNotCopyPlayersIntoAttendance() {
        Team team = new Team();
        team.setId(10L);
        team.setName("P15");

        LocalDateTime start = LocalDateTime.of(2026, 10, 27, 16, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 27, 17, 30);

        when(teamService.getTeamById(10L)).thenReturn(team);
        when(trainingRepository.save(any(Training.class))).thenAnswer(invocation -> {
            Training t = invocation.getArgument(0);
            t.setId(100L);
            return t;
        });

        Training created = trainingService.createTraining(10L, start, end, "FITNESS");

        assertEquals(100L, created.getId());
        assertEquals(TrainingType.FITNESS, created.getType());
        assertEquals("Fysträning", created.getTitle());
        // Issue #86: the list follows the team while open, so nothing is copied on create.
        verify(attendanceRepository, never()).save(any(TrainingAttendance.class));
    }

    @Test
    void updateAttendance_setsStatusForSnapshottedPlayer() {
        Training training = new Training();
        training.setId(100L);
        training.setTeamId(10L);

        TrainingAttendance row = new TrainingAttendance();
        row.setId(1L);
        row.setTrainingId(100L);
        row.setPlayerUserId(30L);
        row.setStatus(null);

        when(trainingRepository.findById(100L)).thenReturn(Optional.of(training));
        when(roster.isLivePlayer(10L, 30L)).thenReturn(true);
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(100L, 30L))
                .thenReturn(Optional.of(row));
        when(attendanceRepository.save(any(TrainingAttendance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TrainingAttendance updated = trainingService.updateAttendance(100L, 30L, "PRESENT");

        assertEquals(AttendanceStatus.PRESENT, updated.getStatus());
    }

    @Test
    void updateAttendance_rejectsPlayerNotInSnapshot() {
        Training training = new Training();
        training.setId(100L);
        training.setTeamId(10L);

        when(trainingRepository.findById(100L)).thenReturn(Optional.of(training));
        when(roster.isLivePlayer(10L, 99L)).thenReturn(false);

        assertThrows(BadRequestException.class,
                () -> trainingService.updateAttendance(100L, 99L, "ABSENT"));
    }

    @Test
    void createTraining_rejectsEndsBeforeStart() {
        LocalDateTime start = LocalDateTime.of(2026, 10, 27, 16, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 27, 15, 0);

        assertThrows(BadRequestException.class,
                () -> trainingService.createTraining(10L, start, end, "FOOTBALL"));
    }

    @Test
    void listAttendance_returnsSnapshotRows() {
        Training training = new Training();
        training.setId(100L);
        training.setTeamId(10L);

        TrainingAttendance row = new TrainingAttendance();
        row.setTrainingId(100L);
        row.setPlayerUserId(30L);
        row.setStatus(null);

        when(trainingRepository.findById(100L)).thenReturn(Optional.of(training));
        when(roster.currentList(training)).thenReturn(List.of(row));

        List<TrainingAttendance> rows = trainingService.listAttendance(100L);

        assertEquals(1, rows.size());
        assertNull(rows.get(0).getStatus());
    }

    @Test
    void chairmanCanCreateTrainingOnAnyTeam() {
        setAuth(70L, "CHAIRMAN");
        Team team = new Team();
        team.setId(10L);
        team.setName("P15");

        LocalDateTime start = LocalDateTime.of(2026, 11, 6, 18, 0);
        LocalDateTime end = LocalDateTime.of(2026, 11, 6, 19, 30);

        when(teamService.getTeamById(10L)).thenReturn(team);
        when(trainingRepository.save(any(Training.class))).thenAnswer(invocation -> {
            Training training = invocation.getArgument(0);
            training.setId(100L);
            return training;
        });

        Training created = trainingService.createTraining(10L, start, end, "FOOTBALL");

        assertEquals(100L, created.getId());
        assertEquals(70L, created.getCreatedByUserId());
        // A chairman is not a coach of the team. The link must not be required.
        verify(teamCoachRepository, never()).existsByTeamIdAndUserId(any(), any());
    }

    @Test
    void chairmanCanUpdateAttendanceOnAnyTeam() {
        setAuth(70L, "CHAIRMAN");
        Training training = new Training();
        training.setId(100L);
        training.setTeamId(10L);

        TrainingAttendance row = new TrainingAttendance();
        row.setTrainingId(100L);
        row.setPlayerUserId(30L);

        when(trainingRepository.findById(100L)).thenReturn(Optional.of(training));
        when(roster.isLivePlayer(10L, 30L)).thenReturn(true);
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(100L, 30L))
                .thenReturn(Optional.of(row));
        when(attendanceRepository.save(any(TrainingAttendance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TrainingAttendance updated = trainingService.updateAttendance(100L, 30L, "ABSENT");

        assertEquals(AttendanceStatus.ABSENT, updated.getStatus());
        verify(teamCoachRepository, never()).existsByTeamIdAndUserId(any(), any());
    }

    @Test
    void coachCanStillCreateTrainingOnOwnTeam() {
        setAuth(80L, "COACH");
        Team team = new Team();
        team.setId(10L);
        team.setName("P15");

        LocalDateTime start = LocalDateTime.of(2026, 11, 6, 18, 0);
        LocalDateTime end = LocalDateTime.of(2026, 11, 6, 19, 30);

        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 80L)).thenReturn(true);
        when(teamService.getTeamById(10L)).thenReturn(team);
        when(trainingRepository.save(any(Training.class))).thenAnswer(invocation -> {
            Training training = invocation.getArgument(0);
            training.setId(101L);
            return training;
        });

        Training created = trainingService.createTraining(10L, start, end, "FOOTBALL");

        assertEquals(101L, created.getId());
        assertEquals(80L, created.getCreatedByUserId());
    }

    @Test
    void coachCanStillUpdateAttendanceOnOwnTeam() {
        setAuth(80L, "COACH");
        Training training = new Training();
        training.setId(101L);
        training.setTeamId(10L);

        TrainingAttendance row = new TrainingAttendance();
        row.setTrainingId(101L);
        row.setPlayerUserId(30L);

        when(teamCoachRepository.existsByTeamIdAndUserId(10L, 80L)).thenReturn(true);
        when(trainingRepository.findById(101L)).thenReturn(Optional.of(training));
        when(roster.isLivePlayer(10L, 30L)).thenReturn(true);
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(101L, 30L))
                .thenReturn(Optional.of(row));
        when(attendanceRepository.save(any(TrainingAttendance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TrainingAttendance updated = trainingService.updateAttendance(101L, 30L, "PRESENT");

        assertEquals(AttendanceStatus.PRESENT, updated.getStatus());
    }

    @Test
    void coachCannotCreateOrUpdateTrainingForAnotherTeam() {
        setAuth(80L, "COACH");
        when(teamCoachRepository.existsByTeamIdAndUserId(11L, 80L)).thenReturn(false);

        LocalDateTime start = LocalDateTime.of(2026, 11, 6, 18, 0);
        LocalDateTime end = LocalDateTime.of(2026, 11, 6, 19, 30);
        assertThrows(AccessDeniedException.class,
                () -> trainingService.createTraining(11L, start, end, "FOOTBALL"));

        Training training = new Training();
        training.setId(102L);
        training.setTeamId(11L);
        when(trainingRepository.findById(102L)).thenReturn(Optional.of(training));
        assertThrows(AccessDeniedException.class,
                () -> trainingService.updateAttendance(102L, 30L, "PRESENT"));
    }
}
