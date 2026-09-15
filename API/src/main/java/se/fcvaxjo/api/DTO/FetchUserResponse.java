package se.fcvaxjo.api.DTO;

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
}
