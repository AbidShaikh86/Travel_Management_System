package com.project.backend.service;

import com.project.backend.DTO.Admin.*;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.exception.PolicyNotFoundException;
import com.project.backend.model.Department;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.Enumerator.Gender;
import com.project.backend.model.Enumerator.PolicyType;
import com.project.backend.model.Enumerator.Role;
import com.project.backend.model.Policy;
import com.project.backend.model.User;
import com.project.backend.model.UserAuth;
import com.project.backend.repository.DepartmentRepository;
import com.project.backend.repository.PolicyRepository;
import com.project.backend.repository.UserAuthRepository;
import com.project.backend.repository.UserRepository;
import com.project.backend.util.GlobalMessage;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PolicyRepository policyRepository;
    private final UserAuthRepository userAuthRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final GlobalMessage globalMessage;
    private final AuditService auditService;

    public AdminService(UserRepository userRepository, PolicyRepository policyRepository, UserAuthRepository userAuthRepository, DepartmentRepository departmentRepository, PasswordEncoder passwordEncoder, GlobalMessage globalMessage, AuditService auditService) {
        this.userRepository = userRepository;
        this.policyRepository = policyRepository;
        this.userAuthRepository = userAuthRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.globalMessage = globalMessage;
        this.auditService = auditService;
    }

    @Transactional
    public ResponseEntity<GlobalResponse> addEmployeeService(@Valid AddEmployeeRequest addEmployeeRequest) {

        if (this.userRepository.existsByEmail(addEmployeeRequest.getEmail())) {
            return this.globalMessage.GlobalMessageHandler(false, "User already exists with email: " + addEmployeeRequest.getEmail(), HttpStatus.CONFLICT);
        }

        if (!this.departmentRepository.existsById(addEmployeeRequest.getDepartmentId())) {
            return this.globalMessage.GlobalMessageHandler(false, "Department not found with ID: " + addEmployeeRequest.getDepartmentId(), HttpStatus.NOT_FOUND);
        }

        User user = User.builder()
                .name(addEmployeeRequest.getName())
                .age(addEmployeeRequest.getAge())
                .gender(addEmployeeRequest.getGender())
                .email(addEmployeeRequest.getEmail())
                .designation(addEmployeeRequest.getDesignation())
                .managerId(addEmployeeRequest.getManagerId())
                .departmentId(addEmployeeRequest.getDepartmentId())
                        .build();

        User savedUser = this.userRepository.save(user);

        UserAuth auth = UserAuth.builder()
                .user(savedUser)
                .role(addEmployeeRequest.getRole())
                .passwordHash(this.passwordEncoder.encode(addEmployeeRequest.getPassword()))
                .build();

        this.userAuthRepository.save(auth);
        this.auditService.log(
                AuditEntityType.EMPLOYEE,
                savedUser.getId(),
                "CREATE_EMPLOYEE",
                "Added employee email=" + savedUser.getEmail()
                        + ", role=" + addEmployeeRequest.getRole()
                        + ", deptId=" + savedUser.getDepartmentId()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Employee Has Been Added", HttpStatus.CREATED);
    }

    @Transactional
    public ResponseEntity<GlobalResponse> addPolicyService(@Valid AddPolicyRequest addPolicyRequest) {
        if (this.policyRepository.existsByName(addPolicyRequest.getName())) {
            return this.globalMessage.GlobalMessageHandler(false, "Policy with " + addPolicyRequest.getName() + " is already exist", HttpStatus.CONFLICT);
        }

        Policy policy = Policy.builder()
                .name(addPolicyRequest.getName())
                .type(addPolicyRequest.getType())
                .value(addPolicyRequest.getValue())
                .comment(addPolicyRequest.getComment())
                .build();

        Policy savedPolicy = this.policyRepository.save(policy);
        this.auditService.log(
                AuditEntityType.POLICY,
                savedPolicy.getId(),
                "CREATE_POLICY",
                "Added policy name=" + savedPolicy.getName()
                        + ", type=" + savedPolicy.getType()
                        + ", value=" + savedPolicy.getValue()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Policy Has Been Added", HttpStatus.CREATED);
    }

    @Transactional(readOnly = true)
    public List<AdminDashboard> getAllEmployeeForDashboard() {
        List<UserAuth> userList = this.userAuthRepository.findAll();

        Integer totalWorkforce = userList.size();

        return userList.stream().map(userAuth -> {
            User user = userAuth.getUser();

            String departmentName = "Not assigned";
            if (user != null && user.getDepartmentId() != null){
                departmentName = this.departmentRepository.findById(user.getDepartmentId())
                        .map(Department::getDepartmentName)
                        .orElse("Not assigned");
            }

            String managerName = "Not assigned";
            if (user != null && user.getManagerId() != null){
                managerName = this.userRepository.findById(user.getManagerId())
                        .map(User::getName)
                        .orElse("Not assigned");
            }

            return AdminDashboard.builder()
                    .id(user != null ? user.getId() : userAuth.getId())
                    .name(user != null ? user.getName() : "Unknown")
                    .email(user != null ? user.getEmail() : "Unknown")
                    .designation(user != null ? user.getDesignation() : "Not assigned")
                    .role(userAuth.getRole() != null ? String.valueOf(userAuth.getRole()) : "Not assigned")
                    .departmentName(departmentName)
                    .departmentId(user != null ? user.getDepartmentId() : null)
                    .managerName(managerName)
                    .managerId(user != null ? user.getManagerId() : null)
                    .totalWorkforce(totalWorkforce)
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<DepartmentDDResponse> getAllDepartment(){
        List<Department> departmentList = this.departmentRepository.findAll();

        double totalAllocated = departmentList.stream()
                .mapToDouble(d -> d.getAnnualTravelBudget() != null ? d.getAnnualTravelBudget() : 0.0)
                .sum();

        return departmentList.stream().map(list -> {

            return DepartmentDDResponse.builder()
                    .id(list.getDeptId())
                    .name(list.getDepartmentName())
                    .annualTravelBudget(list.getAnnualTravelBudget())
                    .totalAllocatedBudget(totalAllocated)
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<ManagerDDResponse> getAllManager(){
        List<UserAuth> auths = this.userAuthRepository.findByRole(Role.MANAGER);

        return auths.stream()
                .filter(auth -> auth.getUser() != null)
                .map(list -> {
            return ManagerDDResponse.builder()
                    .id(list.getUser().getId())
                    .name(list.getUser().getName())
                    .build();
        }).toList();
    }

    @Transactional
    public EmployeeResponse getEmployeeById(Long id){
        User user = this.userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found!"));

        return EmployeeResponse.builder()
                .name(user.getName())
                .age(user.getAge())
                .designation(user.getDesignation())
                .email(user.getEmail())
                .gender(user.getGender() != null ? user.getGender().name() : null)
                .departmentId(user.getDepartmentId())
                .managerId(user.getManagerId())
                .build();
    }

    @Transactional
    public ResponseEntity<GlobalResponse> updateEmployeeById(Long id, EmployeeResponse response) {
        User user = this.userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found!"));

        if (response.getGender() != null && !response.getGender().isBlank()) {
            user.setGender(Gender.valueOf(response.getGender().trim().toUpperCase()));
        }

        user.setName(response.getName());
        user.setAge(response.getAge());
        user.setGender(Gender.valueOf(response.getGender()));
        user.setDesignation(response.getDesignation());
        user.setDepartmentId(response.getDepartmentId());
        user.setManagerId(response.getManagerId());

        this.userRepository.save(user);
        this.auditService.log(
                AuditEntityType.EMPLOYEE,
                user.getId(),
                "UPDATE_EMPLOYEE",
                "Updated employee name=" + user.getName()
                        + ", designation=" + user.getDesignation()
                        + ", deptId=" + user.getDepartmentId()
                        + ", managerId=" + user.getManagerId()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Employee has been updated!", HttpStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public PolicyResponse getPolicyById(Long id) {
        Policy policy = this.policyRepository.findById(id)
                .orElseThrow(() -> new PolicyNotFoundException("Policy not found!"));
        return PolicyResponse.builder()
                .id(policy.getId())
                .name(policy.getName())
                .comment(policy.getComment())
                .stay(policy.getStay())
                .value(policy.getValue())
                .travelClass(policy.getTravelClass())
                .type(policy.getType() != null ? policy.getType().name() : null)
                .active(policy.isActive())
                .build();
    }

    @Transactional
    public ResponseEntity<GlobalResponse> updatePolicyById(Long id, PolicyResponse response) {
        Policy policy = this.policyRepository.findById(id)
                .orElseThrow(() -> new PolicyNotFoundException("Policy not found!"));

        if (response.getType() != null && !response.getType().isBlank()) {
            policy.setType(PolicyType.valueOf(response.getType().trim().toUpperCase()));
        }

        policy.setName(response.getName());
        policy.setTravelClass(response.getTravelClass());
        policy.setComment(response.getComment());
        policy.setStay(response.getStay());
        policy.setType(PolicyType.valueOf(response.getType().trim().toUpperCase()));
        policy.setValue(response.getValue());
        policy.setActive(response.isActive());

        this.policyRepository.save(policy);
        this.auditService.log(
                AuditEntityType.POLICY,
                policy.getId(),
                "UPDATE_POLICY",
                "Updated policy name=" + policy.getName()
                        + ", type=" + policy.getType()
                        + ", value=" + policy.getValue()
                        + ", active=" + policy.isActive()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Policy has been updated!", HttpStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> getAllPolicy() {
        List<Policy> policyList = this.policyRepository.findAll();

        Integer totalPolicy = policyList.size();

        return policyList.stream().map(policy -> {
            return  PolicyResponse.builder()
                    .id(policy.getId())
                    .name(policy.getName())
                    .type(policy.getType() != null ? policy.getType().name() : "Not Found")
                    .value(policy.getValue())
                    .stay(policy.getStay())
                    .travelClass(policy.getTravelClass())
                    .comment(policy.getComment())
                    .active(policy.isActive())
                    .totalPolicy(totalPolicy)
                    .build();
        }).toList();
    }
}
