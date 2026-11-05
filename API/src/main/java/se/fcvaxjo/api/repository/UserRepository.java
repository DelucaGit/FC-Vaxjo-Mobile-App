package se.fcvaxjo.api.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import se.fcvaxjo.api.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    /** Partial name match, ignore case. Several rows can match. */
    List<AppUser> findByNameContainingIgnoreCase(String name);

    /** Active users only for name search in the app. */
    List<AppUser> findByNameContainingIgnoreCaseAndActiveTrue(String name);

    /** Exact shirt number. Unique, so at most one row. */
    Optional<AppUser> findByPlayerNumber(Integer playerNumber);

    /** Exact mobile phone. Unique when set, so at most one row. */
    Optional<AppUser> findByMobilePhoneNumber(String mobilePhoneNumber);

    /** Users that point at this team (players use this). */
    List<AppUser> findByTeamId(Long teamId);

    /** Active players/users on a team. */
    List<AppUser> findByTeamIdAndActiveTrue(Long teamId);

    /** Active users on any of these teams. The ids are bound as parameters. */
    List<AppUser> findByTeamIdInAndActiveTrue(Collection<Long> teamIds);

    /**
     * Name search limited to these teams.
     * Used when a coach must not see the rest of the club.
     */
    List<AppUser> findByNameContainingIgnoreCaseAndActiveTrueAndTeamIdIn(
            String name, Collection<Long> teamIds);

    /** Name search limited to these user ids (coaches or parents on the coach's teams). */
    List<AppUser> findByIdInAndNameContainingIgnoreCaseAndActiveTrue(
            Collection<Long> ids, String name);

    /** Shirt number, but only if that player sits on one of these teams. */
    Optional<AppUser> findByPlayerNumberAndActiveTrueAndTeamIdIn(
            Integer playerNumber, Collection<Long> teamIds);

    /** Phone number, but only if that person sits on one of these teams. */
    Optional<AppUser> findByMobilePhoneNumberAndActiveTrueAndTeamIdIn(
            String mobilePhoneNumber, Collection<Long> teamIds);

    /** Phone number, but only for these user ids. */
    Optional<AppUser> findByMobilePhoneNumberAndActiveTrueAndIdIn(
            String mobilePhoneNumber, Collection<Long> ids);

    /**
     * True when an active player on one of these teams has this parent.
     * That is how a parent belongs to a coach's team: the child has the team id.
     */
    boolean existsByParentIdAndTeamIdInAndActiveTrue(Long parentId, Collection<Long> teamIds);

    /** Active children linked to this parent. */
    List<AppUser> findByParentIdAndActiveTrue(Long parentId);

    List<AppUser> findByActiveTrue();
}
