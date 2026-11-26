package com.project.backend.controller;

import com.project.backend.DTO.Employee.TravelResponse;
import com.project.backend.DTO.Finance.FinanceBudgetRequest;
import com.project.backend.DTO.Finance.FinanceReimburseUpdate;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.service.FinanceService;
import com.project.backend.service.ReimbursementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {
    private final FinanceService financeService;
    private final ReimbursementService reimbursementService;

    public FinanceController(FinanceService financeService, ReimbursementService reimbursementService){
        this.financeService = financeService;
        this.reimbursementService = reimbursementService;
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GlobalResponse> TravelBudgetStatusUpdate(@PathVariable Long id,
                                                                   @Valid @RequestBody FinanceBudgetRequest financeBudgetRequest){
        return this.financeService.travelBudgetStatusUpdate(id, financeBudgetRequest);
    }

    @GetMapping("/reimbursement")
    public List<ReimbursementResponse> getAllReimbursementRequest(){
        return this.financeService.getAllReimbursementRequest();
    }

    @GetMapping("/request/{id}")
    public ManagerTravelDetailResponse getTravelRequestById(@PathVariable Long id){
        return this.financeService.getTravelRequestById(id);
    }

    @GetMapping("/request/all")
    public List<TravelResponse> getAllTravelRequest(){
        return this.financeService.getAllTravelRequest();
    }

    @GetMapping("/reimbursement/{id}")
    public ReimbursementResponse getReimbursementById(@PathVariable Long id){
        return this.financeService.getReimbursementById(id);
    }

    @PatchMapping("/reimbursement/{id}/status-update")
    public ResponseEntity<GlobalResponse> ReimbursmentStatusUpdate(@PathVariable Long id,
                                                                   @Valid @RequestBody FinanceReimburseUpdate financeReimburseUpdate){
        return this.reimbursementService.reimbursementStatusUpdateByFinanace(id, financeReimburseUpdate);
    }

    @PatchMapping("/reimbursement/{id}/paid")
    public ResponseEntity<GlobalResponse> ReimbursmentPaid(@PathVariable Long id){
        return this.reimbursementService.reimbursementPaid(id);
    }
}
