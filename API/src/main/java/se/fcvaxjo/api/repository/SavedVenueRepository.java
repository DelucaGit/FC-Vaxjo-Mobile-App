package se.fcvaxjo.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import se.fcvaxjo.api.model.SavedVenue;

public interface SavedVenueRepository extends JpaRepository<SavedVenue, Long> {

    boolean existsByNameIgnoreCase(String name);
}
