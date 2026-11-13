package se.fcvaxjo.api.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class FetchUserResponse {
    private Long id;
    private String name;
    private String email;
    private String roleName;
    private Integer playerNumber;
    private String mobilePhoneNumber;
    private Long parentId;
    private String parentName;
    private String parentEmail;
    private String parentMobilePhoneNumber;
    private Long teamId;
    private String teamName;
    private boolean active;
    /**
     * Membership dates (#85). Only ADMIN, CHAIRMAN and COACH get them.
     * A PLAYER or PARENT caller gets null. A null memberSince on an old row
     * means "member since earlier"; a null memberUntil means still a member.
     */
    private LocalDate memberSince;
    private LocalDate memberUntil;
}
