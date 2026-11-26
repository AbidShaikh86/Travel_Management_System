package com.project.backend.controller;

import com.project.backend.DTO.Admin.EmployeeResponse;
import com.project.backend.DTO.Employee.TravelResponse;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.reimbursement.ExpenseRequest;
import com.project.backend.DTO.reimbursement.ReimbursementRequest;
import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.DTO.Employee.TravelRequest;
import com.project.backend.service.EmployeeService;
import com.project.backend.service.ReimbursementService;
import com.project.backend.util.GlobalMessage;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final ReimbursementService reimbursementService;
    private final GlobalMessage globalMessage;

    public EmployeeController(EmployeeService employeeService, ReimbursementService reimbursementService, GlobalMessage globalMessage){
        this.employeeService = employeeService;
        this.reimbursementService = reimbursementService;
        this.globalMessage = globalMessage;
    }

    @GetMapping("/profile")
    public ResponseEntity<EmployeeResponse> getMyProfile() {
        return this.employeeService.getUserProfile();
    }

    @GetMapping("/request/{id}/all")
    public List<TravelResponse> getAllTravelRequestByUserId(@PathVariable Long id){
        return this.employeeService.getAllTravelRequestByUserId(id);
    }

    @GetMapping("/request/{id}")
    public TravelResponse getTravelRequestById(@PathVariable Long id){
        return this.employeeService.getTravelRequestById(id);
    }

    @PostMapping("/request")
    public ResponseEntity<GlobalResponse> requestTravel(@Valid @RequestBody TravelRequest travelRequest){
        return this.employeeService.travelRequest(travelRequest);
    }

    @PatchMapping("/request/{id}/update")
    public ResponseEntity<GlobalResponse> updateDraftedTravelRequest(@PathVariable Long id, @RequestBody TravelRequest request){
        return this.employeeService.updateDraftedTravelRequest(id, request);
    }

    @GetMapping("/requests")
    public List<TravelResponse> getMyTravelRequests(){
        return this.employeeService.getMyTravelRequests();
    }

    @PostMapping("/reimbursement/create")
    public ResponseEntity<GlobalResponse> createReimbursement(@Valid @RequestBody ReimbursementRequest reimbursementRequest){
        return this.reimbursementService.createReimbursement(reimbursementRequest);
    }

    @GetMapping("/reimbursements")
    public List<ReimbursementResponse> getMyReimbursements(){
        return this.reimbursementService.getMyReimbursements();
    }

    @GetMapping("/reimbursement/{id}")
    public ResponseEntity<?> getReimbursementById(@PathVariable Long id){
        return this.reimbursementService.getReimbursementById(id);
    }

    @PostMapping(value = "/reimbursement/{id}/add-expense", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalResponse> addExpense(@PathVariable Long id,
                                                    @Valid @ModelAttribute ExpenseRequest expenseRequest){
        return this.reimbursementService.addExpenseToReimbursement(id, expenseRequest);
    }

    @PatchMapping("/reimbursement/{id}/submit")
    public ResponseEntity<GlobalResponse> submitReimbursement(@PathVariable Long id){
        return this.reimbursementService.reimbursementSubmit(id);
    }
}
