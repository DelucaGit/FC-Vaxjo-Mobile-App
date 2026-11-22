package se.fcvaxjo.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A venue in the club's shared list, so coaches can pick it instead of typing it (issue #217).
 * Trainings and matches keep their own venue text, so removing a row here changes nothing on them.
 * The name is stored trimmed; the service checks uniqueness case-insensitive.
 */
@Entity
@Table(name = "saved_venues")
@Getter
@Setter
public class SavedVenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column
    private String address;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
