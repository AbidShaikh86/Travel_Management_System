package com.project.backend.controller;

import com.project.backend.DTO.Admin.*;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.service.AdminService;
import com.project.backend.util.GlobalMessage;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/add-employee")
    public ResponseEntity<GlobalResponse> addEmployee(@Valid @RequestBody AddEmployeeRequest addEmployeeRequest) {
        return this.adminService.addEmployeeService(addEmployeeRequest);
    }

    @PostMapping("/policy")
    public ResponseEntity<GlobalResponse> addPolicy(@Valid @RequestBody AddPolicyRequest policy) {
        return this.adminService.addPolicyService(policy);
    }

    @GetMapping({"/dashboard", "/employees"})
    public List<AdminDashboard> getAllEmployeeForDashboard(){
        return this.adminService.getAllEmployeeForDashboard();
    }

    @GetMapping("/add-employee/department")
    public List<DepartmentDDResponse> getAllDepartment(){
        return this.adminService.getAllDepartment();
    }

    @GetMapping("/add-employee/manager")
    public List<ManagerDDResponse> getAllManager(){
        return this.adminService.getAllManager();
    }

    @PatchMapping("/employee/{id}/update")
    public ResponseEntity<GlobalResponse> updateEmployeeById(@PathVariable Long id, @RequestBody EmployeeResponse response){
        return this.adminService.updateEmployeeById(id, response);
    }

    @GetMapping("/employee/{id}")
    public EmployeeResponse getEmployeeById(@PathVariable Long id){
        return this.adminService.getEmployeeById(id);
    }

    @GetMapping("/policy")
    public List<PolicyResponse> getAllPolicy(){
        return this.adminService.getAllPolicy();
    }

    @GetMapping("/policy/{id}")
    public PolicyResponse getPolicyById(@PathVariable Long id){
        return this.adminService.getPolicyById(id);
    }

    @PatchMapping("/policy/{id}/update")
    public ResponseEntity<GlobalResponse> updatePolicyById(@PathVariable Long id, @RequestBody PolicyResponse response){
        return this.adminService.updatePolicyById(id, response);
    }
}
