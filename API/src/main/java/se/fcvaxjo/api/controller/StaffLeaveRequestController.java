package se.fcvaxjo.api.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.fcvaxjo.api.DTO.DenyLeaveRequestRequest;
import se.fcvaxjo.api.DTO.LeaveRequestResponse;
import se.fcvaxjo.api.service.LeaveRequestService;

/**
 * Staff answer leave requests (issue #213). Roles here; team scope in LeaveRequestService (ADR 0006).
 */
@RestController
@RequestMapping("/api/leave-requests")
public class StaffLeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    public StaffLeaveRequestController(LeaveRequestService leaveRequestService) {
        this.leaveRequestService = leaveRequestService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public List<LeaveRequestResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long teamId) {
        return leaveRequestService.listForStaff(status, teamId);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public LeaveRequestResponse approve(@PathVariable Long id) {
        return leaveRequestService.approve(id);
    }

    @PostMapping("/{id}/deny")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHAIRMAN', 'COACH')")
    public LeaveRequestResponse deny(
            @PathVariable Long id,
            @RequestBody(required = false) DenyLeaveRequestRequest request) {
        return leaveRequestService.deny(id, request == null ? null : request.getNote());
    }
}
