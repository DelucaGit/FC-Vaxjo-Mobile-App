package se.fcvaxjo.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import se.fcvaxjo.api.model.ClubRole;
import se.fcvaxjo.api.model.Role;
import se.fcvaxjo.api.repository.RoleRepository;

@ExtendWith(MockitoExtension.class)
class RoleSeederTest {

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private RoleSeeder roleSeeder;

    @Test
    void seedsChairmanAndEveryOtherClubRoleWhenMissing() {
        when(roleRepository.findByName(anyString())).thenReturn(Optional.empty());

        roleSeeder.run();

        ArgumentCaptor<Role> saved = ArgumentCaptor.forClass(Role.class);
        verify(roleRepository, times(ClubRole.values().length)).save(saved.capture());

        List<String> names = saved.getAllValues().stream().map(Role::getName).toList();
        assertEquals(ClubRole.values().length, names.size());
        for (ClubRole role : ClubRole.values()) {
            assertTrue(names.contains(role.name()), role.name());
        }
        assertTrue(names.contains("CHAIRMAN"));
    }

    @Test
    void doesNotInsertChairmanWhenThatRoleAlreadyExists() {
        Role existing = new Role();
        existing.setId(5L);
        existing.setName("CHAIRMAN");
        when(roleRepository.findByName(anyString())).thenReturn(Optional.empty());
        when(roleRepository.findByName("CHAIRMAN")).thenReturn(Optional.of(existing));

        roleSeeder.run();

        ArgumentCaptor<Role> saved = ArgumentCaptor.forClass(Role.class);
        verify(roleRepository, times(ClubRole.values().length - 1)).save(saved.capture());
        assertTrue(saved.getAllValues().stream().noneMatch(role -> "CHAIRMAN".equals(role.getName())));
    }
}
