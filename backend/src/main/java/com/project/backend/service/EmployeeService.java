package com.project.backend.service;

import com.project.backend.DTO.Admin.EmployeeResponse;
import com.project.backend.DTO.Employee.TravelRequest;
import com.project.backend.DTO.Employee.TravelResponse;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.model.*;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Enumerator.TravelClass;
import com.project.backend.repository.*;
import com.project.backend.util.GlobalMessage;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class EmployeeService {
     private final TravelRequestRepository travelRequestRepository;
     private final UserRepository userRepository;
     private final ApprovalRepository approvalRepository;
     private final DepartmentRepository departmentRepository;
     private final GlobalMessage globalMessage;
     private final PolicyRepository policyRepository;
     private final TravelPolicyFlagRepository travelPolicyFlagRepository;
     private final AuditService auditService;

     public EmployeeService(TravelRequestRepository travelRequestRepository,
                            UserRepository userRepository,
                            ApprovalRepository approvalRepository,
                            DepartmentRepository departmentRepository,
                            GlobalMessage globalMessage,
                            PolicyRepository policyRepository,
                            TravelPolicyFlagRepository travelPolicyFlagRepository,
                            AuditService auditService){
         this.travelRequestRepository = travelRequestRepository;
         this.userRepository = userRepository;
         this.approvalRepository = approvalRepository;
         this.departmentRepository = departmentRepository;
         this.globalMessage = globalMessage;
         this.policyRepository = policyRepository;
         this.travelPolicyFlagRepository = travelPolicyFlagRepository;
         this.auditService = auditService;
     }

    @Transactional
    public ResponseEntity<GlobalResponse> travelRequest(@Valid TravelRequest travelRequest){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = this.userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Unauthorized!"));

        Long approver = null;
        if (user.getManagerId() != null) {
            approver = user.getManagerId();
        } else if (user.getDepartmentId() != null) {
            Department department = this.departmentRepository.findById(user.getDepartmentId()).orElse(null);
            if (department != null) {
                approver = department.getHeadId();
            }
        }

        if (approver == null) {
            return this.globalMessage.GlobalMessageHandler(false, "No manager assigned to approve this request!", HttpStatus.BAD_REQUEST);
        }

        if (approver.equals(user.getId())) {
            return this.globalMessage.GlobalMessageHandler(false, "You cannot be the approver for your own travel request!", HttpStatus.BAD_REQUEST);
        }

        if (travelRequest.getTravelStartDate().isBefore(LocalDate.now())) {
            return this.globalMessage.GlobalMessageHandler(false, "Travel start date cannot be in the past!", HttpStatus.BAD_REQUEST);
        }

        Status initialStatus = "DRAFT".equalsIgnoreCase(travelRequest.getStatus()) ? Status.DRAFT : Status.PENDING;

        TravelClass parsedClass = (travelRequest.getTravelClass() != null && !travelRequest.getTravelClass().isBlank())
                ? TravelClass.valueOf(travelRequest.getTravelClass().trim().toUpperCase())
                : null;

        TravelDetail travelDetail = TravelDetail.builder()
                .user(user)
                .estimatedBudget(travelRequest.getEstimatedBudget())
                .travelClass(parsedClass)
                .status(initialStatus)
                .purpose(travelRequest.getPurpose())
                .stay(travelRequest.getStay())
                .travelStartDate(travelRequest.getTravelStartDate())
                .destination(travelRequest.getDestination())
                .travelClass(TravelClass.valueOf(travelRequest.getTravelClass()))
                .isFlagged(false)
                .build();

        TravelDetail savedTravel = this.travelRequestRepository.save(travelDetail);

        ApprovalFlow flow = ApprovalFlow.builder()
                .travelDetail(savedTravel)
                .managerId(approver)
                .status(initialStatus)
                .build();

        ApprovalFlow savedFlow = this.approvalRepository.save(flow);

        savedTravel.setApprovalFlow(savedFlow);

        savedTravel.setIsFlagged(policyCheck(savedTravel, travelRequest).getIsFlagged());

        this.travelRequestRepository.save(savedTravel);
        this.auditService.log(
                AuditEntityType.TRAVEL_DETAIL,
                savedTravel.getId(),
                "CREATE_TRAVEL_REQUEST",
                "Created travel request destination=" + savedTravel.getDestination()
                        + ", budget=" + savedTravel.getEstimatedBudget()
                        + ", status=" + savedTravel.getStatus()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Travel request has been added successfully!", HttpStatus.CREATED);
    }

    @Transactional(readOnly = true)
    public List<TravelResponse> getMyTravelRequests() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = this.userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Unauthorized!"));

        return this.travelRequestRepository.findByUser_Id(user.getId()).stream()
                .map(detail -> TravelResponse.builder()
                        .id(detail.getId())
                        .destination(detail.getDestination())
                        .purpose(detail.getPurpose())
                        .travelClass(detail.getTravelClass() != null ? detail.getTravelClass().name() : null)
                        .status(detail.getStatus() != null ? detail.getStatus().name() : null)
                        .stay(detail.getStay())
                        .travelStartDate(detail.getTravelStartDate())
                        .estimatedBudget(detail.getEstimatedBudget())
                        .isFlagged(Boolean.TRUE.equals(detail.getIsFlagged()))
                        .managerApproval(detail.getApprovalFlow() != null && detail.getApprovalFlow().getStatus() != null
                                ? detail.getApprovalFlow().getStatus().name()
                                : null)
                        .createdAt(detail.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public ResponseEntity<EmployeeResponse> getUserProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Unauthorized!"));

        return ResponseEntity.ok(EmployeeResponse.builder()
                .name(user.getName())
                .age(user.getAge())
                .email(user.getEmail())
                .designation(user.getDesignation())
                .gender(user.getGender() != null ? user.getGender().name() : null)
                .departmentId(user.getDepartmentId())
                .managerId(user.getManagerId())
                .build());
    }

    @Transactional(readOnly = true)
    public TravelResponse getTravelRequestById(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TravelDetail detail = this.travelRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Travel request not found!"));

        if (!detail.getUser().getEmail().equals(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized!");
        }

        return TravelResponse.builder()
                .id(detail.getId())
                .destination(detail.getDestination())
                .purpose(detail.getPurpose())
                .travelClass(detail.getTravelClass() != null ? detail.getTravelClass().name() : null)
                .status(detail.getStatus() != null ? detail.getStatus().name() : null)
                .stay(detail.getStay())
                .travelStartDate(detail.getTravelStartDate())
                .estimatedBudget(detail.getEstimatedBudget())
                .isFlagged(Boolean.TRUE.equals(detail.getIsFlagged()))
                .managerApproval(detail.getApprovalFlow() != null && detail.getApprovalFlow().getStatus() != null
                        ? detail.getApprovalFlow().getStatus().name()
                        : null)
                .createdAt(detail.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TravelResponse> getAllTravelRequestByUserId(Long id) {
         List<TravelDetail> travelList = this.travelRequestRepository.findAllByUser_Id(id);

         return travelList.stream()
                 .map(list -> {
                     return TravelResponse.builder()
                             .purpose(list.getPurpose())
                             .estimatedBudget(list.getEstimatedBudget())
                             .travelClass(String.valueOf(list.getTravelClass()))
                             .status(String.valueOf(list.getStatus()))
                             .travelStartDate(list.getTravelStartDate())
                             .destination(list.getDestination())
                             .managerApproval(String.valueOf(list.getApprovalFlow().getStatus()))
                             .createdAt(list.getCreatedAt())
                             .build();
                 }).toList();
    }

    @Transactional
    public ResponseEntity<GlobalResponse> updateDraftedTravelRequest(Long id, TravelRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TravelDetail detail = this.travelRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Travel request Not found!"));

        if (!detail.getUser().getEmail().equals(email)) {
            return this.globalMessage.GlobalMessageHandler(false, "Unauthorized!", HttpStatus.FORBIDDEN);
        }

        if (detail.getStatus() != Status.DRAFT) {
            return this.globalMessage.GlobalMessageHandler(false, "Travel request is already submitted!", HttpStatus.CONFLICT);
        }

        Status targetStatus = "PENDING".equalsIgnoreCase(request.getStatus()) ? Status.PENDING : Status.DRAFT;

        if (targetStatus == Status.PENDING && request.getTravelStartDate() != null
                && request.getTravelStartDate().isBefore(LocalDate.now())) {
            return this.globalMessage.GlobalMessageHandler(false, "Travel start date cannot be in the past!",
                    HttpStatus.BAD_REQUEST);
        }

        detail.setDestination(request.getDestination());
        detail.setTravelClass(
                request.getTravelClass() != null && !request.getTravelClass().isBlank()
                        ? TravelClass.valueOf(request.getTravelClass().trim().toUpperCase())
                        : null
        );
        detail.setTravelStartDate(request.getTravelStartDate());
        detail.setPurpose(request.getPurpose());
        detail.setStay(request.getStay());
        detail.setEstimatedBudget(request.getEstimatedBudget());
        detail.setStatus(targetStatus);

        if (detail.getApprovalFlow() != null) {
            detail.getApprovalFlow().setStatus(targetStatus);
            this.approvalRepository.save(detail.getApprovalFlow());
        }

        TravelDetail savedTravel = this.travelRequestRepository.save(detail);
        savedTravel.setIsFlagged(Boolean.TRUE.equals(policyCheck(savedTravel, request).getIsFlagged()));
        this.travelRequestRepository.save(savedTravel);

        this.auditService.log(
                AuditEntityType.TRAVEL_DETAIL,
                savedTravel.getId(),
                "UPDATE_TRAVEL_REQUEST",
                "Updated travel request destination=" + savedTravel.getDestination()
                        + ", budget=" + savedTravel.getEstimatedBudget()
                        + ", status=" + savedTravel.getStatus()
        );

        String msg = targetStatus == Status.PENDING
                ? "Travel request has been submitted for approval!"
                : "Travel draft has been updated!";
        return this.globalMessage.GlobalMessageHandler(true, msg, HttpStatus.ACCEPTED);
    }

    public TravelDetail policyCheck(TravelDetail savedTravel, TravelRequest travelRequest){
        List<Policy> policyList = this.policyRepository.findByActiveTrue();
        for (Policy policy : policyList) {
            boolean violated = false;

            switch (policy.getType()) {
                case BUDGET_LIMIT -> {
                    if (travelRequest.getEstimatedBudget() != null && travelRequest.getEstimatedBudget() >= policy.getValue()) {
                        violated = true;
                    }
                }
                case STAY_LIMIT -> {
                    if (travelRequest.getStay() != null && policy.getStay() > 0 && travelRequest.getStay() >= policy.getStay()) {
                        violated = true;
                    }
                }
                case TRAVEL_CLASS -> {
                    if (travelRequest.getTravelClass() != null && travelRequest.getTravelClass().equalsIgnoreCase(policy.getTravelClass())) {
                        violated = true;
                    }
                }
                default -> {}
            }

            if (violated) {
                TravelPolicyFlag policyFlag = TravelPolicyFlag.builder()
                        .travelDetail(savedTravel)
                        .policy(policy)
                        .policyName(policy.getName())
                        .policyType(policy.getType())
                        .justification(travelRequest.getJustification())
                        .build();
                savedTravel.setIsFlagged(true);
                this.travelPolicyFlagRepository.save(policyFlag);
            }
        }
        return savedTravel;
    }
}
