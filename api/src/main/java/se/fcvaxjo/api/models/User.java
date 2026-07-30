package se.fcvaxjo.api.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

/**
 * Anyone who can log in to the app.
 * The Role field says if they are admin, coach, parent, or player.
 *
 * Table name is "app_users" because "user" is a reserved word in PostgreSQL.
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    /** Login email — must be unique. */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * Stored as plain text for now while we learn.
     * Next security step: hash passwords (never store real passwords like this).
     */
    @Column(nullable = false)
    private String password;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
}
