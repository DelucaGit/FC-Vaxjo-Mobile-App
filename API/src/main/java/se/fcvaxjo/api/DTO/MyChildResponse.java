package se.fcvaxjo.api.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class MyChildResponse {
    private Long id;
    private String name;
    private Long teamId;
    private String teamName;
}
