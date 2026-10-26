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

import se.fcvaxjo.api.DTO.NewParentRequest;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void searchByPlayerNumber_returnsUser() {
        AppUser erik = new AppUser();
        erik.setId(1L);
        erik.setName("Erik");
        erik.setPlayerNumber(7);

        when(userRepository.findByPlayerNumber(7)).thenReturn(Optional.of(erik));

        AppUser result = userService.searchByPlayerNumber(7);

        assertEquals("Erik", result.getName());
        assertEquals(7, result.getPlayerNumber());
    }

    @Test
    void searchByPlayerNumber_throwsWhenMissing() {
        when(userRepository.findByPlayerNumber(99)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> userService.searchByPlayerNumber(99));
    }

    @Test
    void searchByPlayerNumber_throwsWhenNull() {
        assertThrows(BadRequestException.class,
                () -> userService.searchByPlayerNumber(null));
    }

    @Test
    void createPlayer_withoutParent_throws() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));

        assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, null, null));
    }

    @Test
    void createPlayer_withExistingParent_setsParentId() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");

        Role parentRole = new Role();
        parentRole.setId(4L);
        parentRole.setName("PARENT");

        AppUser parent = new AppUser();
        parent.setId(20L);
        parent.setName("Parent One");
        parent.setRoleId(4L);

        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));
        when(userRepository.findById(20L)).thenReturn(Optional.of(parent));
        when(roleRepository.findById(4L)).thenReturn(Optional.of(parentRole));
        when(userRepository.findByEmail("kid@fcvaxjo.se")).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser saved = invocation.getArgument(0);
            saved.setId(30L);
            return saved;
        });

        AppUser result = userService.createUser(
                "Kid", "kid@fcvaxjo.se", "PLAYER", 10, null, 20L, null);

        assertEquals(30L, result.getId());
        assertEquals(20L, result.getParentId());
    }

    @Test
    void createPlayer_newParentMissingPhone_throws() {
        Role playerRole = new Role();
        playerRole.setId(3L);
        playerRole.setName("PLAYER");
        when(roleRepository.findByName("PLAYER")).thenReturn(Optional.of(playerRole));

        NewParentRequest newParent = new NewParentRequest();
        newParent.setName("Parent Two");
        newParent.setEmail("parent2@fcvaxjo.se");
        newParent.setMobilePhoneNumber("  ");

        assertThrows(BadRequestException.class,
                () -> userService.createUser(
                        "Kid2", "kid2@fcvaxjo.se", "PLAYER", null, null, null, newParent));
    }
}
