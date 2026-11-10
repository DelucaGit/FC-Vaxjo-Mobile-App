package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
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
import se.fcvaxjo.api.model.Training;
import se.fcvaxjo.api.model.TrainingAttendance;
import se.fcvaxjo.api.repository.MatchRepository;
import se.fcvaxjo.api.repository.TrainingAttendanceRepository;
import se.fcvaxjo.api.repository.TrainingRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.service.MyScheduleService.ScheduleRow;

@ExtendWith(MockitoExtension.class)
class MyScheduleServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TrainingRepository trainingRepository;

    @Mock
    private TrainingAttendanceRepository attendanceRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private UserService userService;

    @Mock
    private TeamService teamService;

    @Mock
    private TrainingAttendanceRoster roster;

    @InjectMocks
    private MyScheduleService myScheduleService;

    @BeforeEach
    void trainingsAreNeverDueHere() {
        // The auto-freeze rule is tested over HTTP with a controllable clock.
        lenient().when(roster.freezeIfDue(any(Training.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void playerSeesOwnTeamTrainingsWithStatus() {
        setAuth(20L, "PLAYER");

        AppUser player = player(20L, 10L, null);
        Training training = training(100L, 10L);

        when(userRepository.findById(20L)).thenReturn(Optional.of(player));
        when(userService.getRoleName(2L)).thenReturn("PLAYER");
        when(trainingRepository.findByTeamIdOrderByStartsAtDesc(10L))
                .thenReturn(List.of(training));

        TrainingAttendance row = new TrainingAttendance();
        row.setStatus(AttendanceStatus.PRESENT);
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(100L, 20L))
                .thenReturn(Optional.of(row));

        List<ScheduleRow> rows = myScheduleService.listMyTrainings(null);

        assertEquals(1, rows.size());
        assertEquals(100L, rows.get(0).training().getId());
        assertEquals("PRESENT", rows.get(0).status());
    }

    @Test
    void playerCannotPassChildId() {
        setAuth(20L, "PLAYER");

        AppUser player = player(20L, 10L, null);
        when(userRepository.findById(20L)).thenReturn(Optional.of(player));

        assertThrows(AccessDeniedException.class,
                () -> myScheduleService.listMyTrainings(99L));
    }

    @Test
    void parentSeesLinkedChildSchedule() {
        setAuth(50L, "PARENT");

        AppUser parent = parent(50L);
        AppUser child = player(20L, 10L, 50L);
        Training training = training(100L, 10L);

        when(userRepository.findById(50L)).thenReturn(Optional.of(parent));
        when(userRepository.findByParentIdAndActiveTrue(50L)).thenReturn(List.of(child));
        when(userService.getRoleName(2L)).thenReturn("PLAYER");
        when(userRepository.findById(20L)).thenReturn(Optional.of(child));
        when(trainingRepository.findByTeamIdOrderByStartsAtDesc(10L))
                .thenReturn(List.of(training));
        when(attendanceRepository.findByTrainingIdAndPlayerUserId(100L, 20L))
                .thenReturn(Optional.empty());

        List<ScheduleRow> rows = myScheduleService.listMyTrainings(20L);

        assertEquals(1, rows.size());
        assertEquals(20L, rows.get(0).player().getId());
        assertEquals(null, rows.get(0).status());
    }

    @Test
    void parentBlockedOnStrangerChild() {
        setAuth(50L, "PARENT");

        AppUser parent = parent(50L);
        AppUser ownChild = player(20L, 10L, 50L);
        AppUser stranger = player(99L, 10L, 77L);

        when(userRepository.findById(50L)).thenReturn(Optional.of(parent));
        when(userRepository.findByParentIdAndActiveTrue(50L)).thenReturn(List.of(ownChild));
        when(userService.getRoleName(2L)).thenReturn("PLAYER");
        when(userRepository.findById(99L)).thenReturn(Optional.of(stranger));

        assertThrows(AccessDeniedException.class,
                () -> myScheduleService.listMyTrainings(99L));
    }

    @Test
    void parentRequiresChildIdWhenHasChildren() {
        setAuth(50L, "PARENT");

        AppUser parent = parent(50L);
        AppUser child = player(20L, 10L, 50L);

        when(userRepository.findById(50L)).thenReturn(Optional.of(parent));
        when(userRepository.findByParentIdAndActiveTrue(50L)).thenReturn(List.of(child));
        when(userService.getRoleName(2L)).thenReturn("PLAYER");

        assertThrows(BadRequestException.class,
                () -> myScheduleService.listMyTrainings(null));
    }

    @Test
    void parentWithNoChildrenGetsEmptySchedule() {
        setAuth(50L, "PARENT");

        AppUser parent = parent(50L);
        when(userRepository.findById(50L)).thenReturn(Optional.of(parent));
        when(userRepository.findByParentIdAndActiveTrue(50L)).thenReturn(List.of());

        List<ScheduleRow> rows = myScheduleService.listMyTrainings(null);

        assertTrue(rows.isEmpty());
    }

    @Test
    void listMyChildren_returnsLinkedPlayers() {
        setAuth(50L, "PARENT");

        AppUser child = player(20L, 10L, 50L);
        when(userRepository.findByParentIdAndActiveTrue(50L)).thenReturn(List.of(child));
        when(userService.getRoleName(2L)).thenReturn("PLAYER");

        List<AppUser> children = myScheduleService.listMyChildren();

        assertEquals(1, children.size());
        assertEquals(20L, children.get(0).getId());
    }

    private void setAuth(Long userId, String role) {
        var auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private AppUser player(Long id, Long teamId, Long parentId) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setName("Player " + id);
        user.setRoleId(2L);
        user.setTeamId(teamId);
        user.setParentId(parentId);
        user.setActive(true);
        return user;
    }

    private AppUser parent(Long id) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setName("Parent " + id);
        user.setRoleId(3L);
        user.setActive(true);
        return user;
    }

    private Training training(Long id, Long teamId) {
        Training training = new Training();
        training.setId(id);
        training.setTeamId(teamId);
        training.setTitle("Training");
        training.setStartsAt(LocalDateTime.of(2026, 10, 28, 18, 0));
        training.setEndsAt(LocalDateTime.of(2026, 10, 28, 19, 30));
        training.setCreatedByUserId(1L);
        return training;
    }
}
