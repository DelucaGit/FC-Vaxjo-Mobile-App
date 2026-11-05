package se.fcvaxjo.api.model;

import java.time.Instant;

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

    /**
     * Mobile phone number. Unique when set. Null is allowed.
     * Postgres still allows many nulls on a unique column.
     * Stored as a String because it may contain + and spaces.
     */
    @Column(nullable = true, unique = true)
    private String mobilePhoneNumber;

    /**
     * The one PARENT linked to this user when the role is PLAYER.
     * Null for coaches, admins, and parents themselves.
     */
    @Column(name = "parent_id", nullable = true)
    private Long parentId;

    /**
     * The one TEAM for a PLAYER (e.g. P15). Required when creating a PLAYER.
     * Null for PARENT / ADMIN. Coaches use team_coaches instead of this column.
     */
    @Column(name = "team_id", nullable = true)
    private Long teamId;

    /**
     * Soft delete flag. false = removed from the club lists but row kept.
     * New users start as active.
     */
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active = true;

    /**
     * BCrypt hash of the password. Never sent in list/search responses.
     */
    @Column(name = "password_hash", nullable = true)
    private String passwordHash;

    /**
     * True until the user changes the temporary password after first login.
     */
    @Column(name = "must_change_password", nullable = false, columnDefinition = "boolean default true")
    private boolean mustChangePassword = true;

    /**
     * When this password hash was last written. Null on rows saved before
     * this column was filled in. A new hash always sets it, including the
     * first save and a demo-password rewrite.
     *
     * The JWT filter compares this with the token's {@code iat}. A token from
     * an earlier second is rejected. The comparison is a strict {@code >} on
     * whole seconds, so a login in the same second as this write still works.
     * There is no Flyway or Liquibase (ADR 0002). Hibernate adds the nullable
     * column on startup ({@code ddl-auto=update}).
     */
    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    /**
     * When the linked parent allowed this player's name and shirt number
     * on the public site. Null means no consent. That is the default.
     * Contact details are never published, even when this is set.
     * There is no Flyway (ADR 0002). Hibernate adds the nullable column.
     */
    @Column(name = "public_consent_at")
    private Instant publicConsentAt;
}
