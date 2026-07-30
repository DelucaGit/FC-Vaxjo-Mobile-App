package se.fcvaxjo.api.models;

/**
 * What kind of account a User has in the club app.
 *
 * ADMIN  = club staff who manage teams and users
 * COACH  = trains a team
 * PARENT = guardian of one or more players
 * PLAYER = a player who has their own login (often older youth)
 */
public enum Role {
    ADMIN,
    COACH,
    PARENT,
    PLAYER
}
