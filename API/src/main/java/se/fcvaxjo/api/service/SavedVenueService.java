package se.fcvaxjo.api.service;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.fcvaxjo.api.DTO.CreateSavedVenueRequest;
import se.fcvaxjo.api.DTO.SavedVenueResponse;
import se.fcvaxjo.api.exception.BadRequestException;
import se.fcvaxjo.api.exception.NotFoundException;
import se.fcvaxjo.api.model.SavedVenue;
import se.fcvaxjo.api.repository.SavedVenueRepository;

/**
 * The club's shared list of saved venues (issue #217). No team scope: every coach sees and
 * changes the same list. The controller lets only ADMIN, CHAIRMAN and COACH in.
 * Removing a venue does not touch trainings or matches; they keep their own venue text.
 */
@Service
public class SavedVenueService {

    static final String NEED_NAME = "Ange ett namn på platsen.";
    static final String DUPLICATE = "Det finns redan en sparad plats med det namnet.";
    static final String NOT_FOUND = "Den sparade platsen hittades inte.";

    private static final Collator SWEDISH = Collator.getInstance(Locale.of("sv", "SE"));

    private final SavedVenueRepository savedVenueRepository;

    public SavedVenueService(SavedVenueRepository savedVenueRepository) {
        this.savedVenueRepository = savedVenueRepository;
    }

    @Transactional(readOnly = true)
    public List<SavedVenueResponse> list() {
        return savedVenueRepository.findAll().stream()
                .sorted(Comparator.comparing(SavedVenue::getName, SWEDISH))
                .map(SavedVenueService::toResponse)
                .toList();
    }

    @Transactional
    public SavedVenueResponse create(CreateSavedVenueRequest request) {
        String name = trimToNull(request.getName());
        if (name == null) {
            throw new BadRequestException(NEED_NAME);
        }
        if (savedVenueRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException(DUPLICATE);
        }
        SavedVenue venue = new SavedVenue();
        venue.setName(name);
        venue.setAddress(trimToNull(request.getAddress()));
        venue.setCreatedByUserId(currentUserId());
        return toResponse(savedVenueRepository.save(venue));
    }

    @Transactional
    public void delete(Long id) {
        SavedVenue venue = savedVenueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(NOT_FOUND));
        savedVenueRepository.delete(venue);
    }

    private static SavedVenueResponse toResponse(SavedVenue venue) {
        return new SavedVenueResponse(
                venue.getId(), venue.getName(), venue.getAddress(), venue.getCreatedByUserId());
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new AccessDeniedException("Not logged in");
        }
        return id;
    }
}
