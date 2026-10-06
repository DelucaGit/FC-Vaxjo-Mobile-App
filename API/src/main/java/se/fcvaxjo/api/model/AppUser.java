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
 * One row in the {@code users} table. The client never sees this class.
 * HTTP responses use DTOs such as FetchUserResponse.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String email;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    /**
     * Shirt number. Unique when set. Null is allowed: coaches and parents
     * have none, and a player can be created before the kit number is decided.
     * Postgres still allows many nulls on a unique column.
     */
    @Column(nullable = true, unique = true)
    private Integer playerNumber;
}
