package se.fcvaxjo.api.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.CreateSavedVenueRequest;
import se.fcvaxjo.api.DTO.SavedVenueResponse;
import se.fcvaxjo.api.service.SavedVenueService;

/** The club's shared list of saved venues (issue #217). Staff only, no team scope. */
@RestController
@RequestMapping("/api/saved-venues")
public class SavedVenueController {

    private final SavedVenueService savedVenueService;

    public SavedVenueController(SavedVenueService savedVenueService) {
        this.savedVenueService = savedVenueService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<SavedVenueResponse> list() {
        return savedVenueService.list();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<SavedVenueResponse> create(@RequestBody CreateSavedVenueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(savedVenueService.create(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        savedVenueService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
