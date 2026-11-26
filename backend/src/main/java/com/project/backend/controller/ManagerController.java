package com.project.backend.controller;

import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.AllPendingResponse;
import com.project.backend.DTO.Manager.ApprovalFlowUpdateRequest;
import com.project.backend.DTO.Manager.AssignTravelRequest;
import com.project.backend.DTO.Manager.ManagerHistoryResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.Manager.TeamMemberResponse;
import com.project.backend.service.ManagerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {

    private final ManagerService managerService;

    public ManagerController(ManagerService managerService){
        this.managerService = managerService;
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GlobalResponse> ManagerTravelStatusUpdate(@PathVariable Long id, @Valid @RequestBody ApprovalFlowUpdateRequest approvalFlowUpdateRequest){
        return this.managerService.updateTravelRequestStatus(id, approvalFlowUpdateRequest);
    }

    @GetMapping("/pending")
    public List<AllPendingResponse> getPendingApprovals() {
        return this.managerService.getPendingApprovals();
    }

    @GetMapping("/team")
    public List<TeamMemberResponse> getTeam() {
        return this.managerService.getTeam();
    }

    @PostMapping("/assign-travel")
    public ResponseEntity<GlobalResponse> assignTravel(@Valid @RequestBody AssignTravelRequest request) {
        return this.managerService.assignTravel(request);
    }

    @GetMapping("/requests/{id}")
    public ManagerTravelDetailResponse getTravelRequestById(@PathVariable Long id) {
        return this.managerService.getTravelRequestById(id);
    }

    @GetMapping("/history")
    public List<ManagerHistoryResponse> getApprovalHistory() {
        return this.managerService.getApprovalHistory();
    }
}
