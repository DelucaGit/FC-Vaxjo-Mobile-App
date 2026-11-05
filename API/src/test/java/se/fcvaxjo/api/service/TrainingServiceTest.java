package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.AttendanceStatus;
import se.fcvaxjo.api.model.Team;
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
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

    @InjectMocks
    private TrainingService trainingService;

    @BeforeEach
    void setAdminAuth() {
        var auth = new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createTraining_snapshotsActivePlayers() {
        Team team = new Team();
        team.setId(10L);
        team.setName("P15");

        AppUser player = new AppUser();
        player.setId(30L);
        player.setName("Erik");

        LocalDateTime start = LocalDateTime.of(2026, 10, 27, 16, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 27, 17, 30);

        when(teamService.getTeamById(10L)).thenReturn(team);
        when(teamService.listPlayers(10L)).thenReturn(List.of(player));
        when(trainingRepository.save(any(Training.class))).thenAnswer(invocation -> {
            Training t = invocation.getArgument(0);
            t.setId(100L);
            return t;
        });
        when(attendanceRepository.save(any(TrainingAttendance.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Training created = trainingService.createTraining(10L, start, end, "Evening");

        assertEquals(100L, created.getId());
        assertEquals("Evening", created.getTitle());
        verify(attendanceRepository, times(1)).save(any(TrainingAttendance.class));
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
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(100L, 99L))
                .thenReturn(Optional.empty());

        assertThrows(BadRequestException.class,
                () -> trainingService.updateAttendance(100L, 99L, "ABSENT"));
    }

    @Test
    void createTraining_rejectsEndsBeforeStart() {
        LocalDateTime start = LocalDateTime.of(2026, 10, 27, 16, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 27, 15, 0);

        assertThrows(BadRequestException.class,
                () -> trainingService.createTraining(10L, start, end, null));
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
        when(attendanceRepository.findByTrainingId(100L)).thenReturn(List.of(row));

        List<TrainingAttendance> rows = trainingService.listAttendance(100L);

        assertEquals(1, rows.size());
        assertNull(rows.get(0).getStatus());
    }
}
