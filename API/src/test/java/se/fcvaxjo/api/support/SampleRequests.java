package se.fcvaxjo.api.support;

import java.time.LocalDateTime;

import se.fcvaxjo.api.DTO.AddCoachRequest;
import se.fcvaxjo.api.DTO.ChangePasswordRequest;
import se.fcvaxjo.api.DTO.ChangeRoleRequest;
import se.fcvaxjo.api.DTO.CreateTeamRequest;
import se.fcvaxjo.api.DTO.CreateTrainingRequest;
import se.fcvaxjo.api.DTO.CreateUserRequest;
import se.fcvaxjo.api.DTO.LoginRequest;
import se.fcvaxjo.api.DTO.SearchUsersRequest;
import se.fcvaxjo.api.DTO.UpdateAttendanceRequest;
import se.fcvaxjo.api.DTO.UpdatePlayerRequest;

/**
 * JSON bodies for the role tests. Fields match what the service already accepts,
 * so a 403 means "not allowed" and not "bad JSON".
 */
public final class SampleRequests {

    private SampleRequests() {
    }

    public static LoginRequest login(String email, String phrase) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(phrase);
        return request;
    }

    public static ChangePasswordRequest changeLogin(String current, String next) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(current);
        request.setNewPassword(next);
        return request;
    }

    public static CreateUserRequest newPlayer(String email, String phone, int shirt, long parentId, long teamId) {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Test Ny Spelare");
        request.setEmail(email);
        request.setRoleName("PLAYER");
        request.setPlayerNumber(shirt);
        request.setMobilePhoneNumber(phone);
        request.setParentId(parentId);
        request.setTeamId(teamId);
        return request;
    }

    public static CreateUserRequest newCoach(String email) {
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Test Ny Tranare");
        request.setEmail(email);
        request.setRoleName("COACH");
        return request;
    }

    public static UpdatePlayerRequest keepPlayer(String name, String email, String phone, int shirt, long teamId) {
        UpdatePlayerRequest request = new UpdatePlayerRequest();
        request.setName(name);
        request.setEmail(email);
        request.setMobilePhoneNumber(phone);
        request.setPlayerNumber(shirt);
        request.setTeamId(teamId);
        return request;
    }

    public static ChangeRoleRequest role(String roleName) {
        ChangeRoleRequest request = new ChangeRoleRequest();
        request.setRoleName(roleName);
        return request;
    }

    public static CreateTeamRequest team(String name) {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName(name);
        return request;
    }

    public static AddCoachRequest coach(long userId) {
        AddCoachRequest request = new AddCoachRequest();
        request.setUserId(userId);
        return request;
    }

    public static CreateTrainingRequest training(long teamId) {
        CreateTrainingRequest request = new CreateTrainingRequest();
        request.setTeamId(teamId);
        request.setStartsAt(LocalDateTime.of(2026, 12, 1, 18, 0));
        request.setEndsAt(LocalDateTime.of(2026, 12, 1, 19, 0));
        request.setTitle("Extra testtraning");
        return request;
    }

    public static UpdateAttendanceRequest present() {
        UpdateAttendanceRequest request = new UpdateAttendanceRequest();
        request.setStatus("PRESENT");
        return request;
    }

    public static SearchUsersRequest searchByName(String name) {
        SearchUsersRequest request = new SearchUsersRequest();
        request.setName(name);
        return request;
    }

    public static SearchUsersRequest searchByShirt(int playerNumber) {
        SearchUsersRequest request = new SearchUsersRequest();
        request.setPlayerNumber(playerNumber);
        return request;
    }

    public static SearchUsersRequest searchByPhone(String phone) {
        SearchUsersRequest request = new SearchUsersRequest();
        request.setPhone(phone);
        return request;
    }
}
