package se.fcvaxjo.api.models;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Player {
    private String id;
    private User user; // The player itself.
    private User parent; // The parent of the player.
    private User coach; // The coach of the player.
}