package se.fcvaxjo.api.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.CreateLeaveRequestRequest;
import se.fcvaxjo.api.DTO.LeaveRequestResponse;
import se.fcvaxjo.api.service.LeaveRequestService;

/**
 * Leave requests (issue #210). Only PLAYER and PARENT; staff answer them elsewhere (later issue).
 * Which player is allowed is checked in LeaveRequestService.
 */
@RestController
@RequestMapping("/api/my/leave-requests")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    public LeaveRequestController(LeaveRequestService leaveRequestService) {
        this.leaveRequestService = leaveRequestService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public ResponseEntity<LeaveRequestResponse> create(@RequestBody CreateLeaveRequestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveRequestService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public List<LeaveRequestResponse> list(@RequestParam(required = false) Long childId) {
        return leaveRequestService.listMine(childId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PLAYER', 'PARENT')")
    public ResponseEntity<Void> withdraw(@PathVariable Long id) {
        leaveRequestService.withdraw(id);
        return ResponseEntity.noContent().build();
    }
}
