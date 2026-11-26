package com.project.backend.service;

import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.AllPendingResponse;
import com.project.backend.DTO.Manager.ApprovalFlowUpdateRequest;
import com.project.backend.DTO.Manager.AssignTravelRequest;
import com.project.backend.DTO.Manager.FlaggedPolicyResponse;
import com.project.backend.DTO.Manager.ManagerHistoryResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.Manager.TeamMemberResponse;
import com.project.backend.model.ApprovalFlow;
import com.project.backend.model.Department;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Enumerator.TravelClass;
import com.project.backend.model.TravelDetail;
import com.project.backend.model.TravelPolicyFlag;
import com.project.backend.model.User;
import com.project.backend.repository.ApprovalRepository;
import com.project.backend.repository.DepartmentRepository;
import com.project.backend.repository.TravelPolicyFlagRepository;
import com.project.backend.repository.TravelRequestRepository;
import com.project.backend.repository.UserRepository;
import com.project.backend.util.GlobalMessage;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ManagerService {

    private final ApprovalRepository approvalRepository;
    private final TravelRequestRepository travelRequestRepository;
    private final UserRepository userRepository;
    private final TravelPolicyFlagRepository travelPolicyFlagRepository;
    private final DepartmentRepository departmentRepository;
    private final GlobalMessage globalMessage;
    private final AuditService auditService;

    public ManagerService(ApprovalRepository approvalRepository,
                          TravelRequestRepository travelRequestRepository,
                          UserRepository userRepository,
                          TravelPolicyFlagRepository travelPolicyFlagRepository,
                          DepartmentRepository departmentRepository,
                          GlobalMessage globalMessage,
                          AuditService auditService){
        this.approvalRepository = approvalRepository;
        this.travelRequestRepository = travelRequestRepository;
        this.userRepository = userRepository;
        this.travelPolicyFlagRepository = travelPolicyFlagRepository;
        this.departmentRepository = departmentRepository;
        this.globalMessage = globalMessage;
        this.auditService = auditService;
    }

    @Transactional
    public ResponseEntity<GlobalResponse> updateTravelRequestStatus(Long id, ApprovalFlowUpdateRequest request) {

        User currentManager = getCurrentManager();

        TravelDetail detail = this.travelRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Travel not found!"));

        ApprovalFlow flow = detail.getApprovalFlow();
        if (flow == null) {
            return this.globalMessage.GlobalMessageHandler(false, "Approval flow record missing for travel ID: " + id, HttpStatus.BAD_REQUEST);
        }

        if (!flow.getManagerId().equals(currentManager.getId())) {
            return this.globalMessage.GlobalMessageHandler(false, "You are not authorized to approve/reject this request!", HttpStatus.FORBIDDEN);
        }

        if (flow.getStatus() == Status.APPROVED) {
            return this.globalMessage.GlobalMessageHandler(false, "Request is already approved!", HttpStatus.CONFLICT);
        }
        if (flow.getStatus() == Status.REJECTED || flow.getStatus() == Status.CANCELLED) {
            return this.globalMessage.GlobalMessageHandler(false, "Cannot modify a request that has already been finalized/cancelled!",
                    HttpStatus.BAD_REQUEST);
        }
        if (detail.getStatus() == Status.DRAFT) {
            return this.globalMessage.GlobalMessageHandler(false, "Employee has not submitted this request yet (still in DRAFT)!", HttpStatus.BAD_REQUEST);
        }

        Status newStatus = Status.valueOf(request.getStatus());
        if (newStatus != Status.APPROVED && newStatus != Status.REJECTED) {
            return this.globalMessage.GlobalMessageHandler(false, "Managers can only set status to APPROVED or REJECTED!", HttpStatus.BAD_REQUEST);
        }

        if (newStatus == Status.REJECTED && (request.getComment() == null || request.getComment().isBlank())) {
            return this.globalMessage.GlobalMessageHandler(false, "Rejection comment is required!", HttpStatus.BAD_REQUEST);
        }

        flow.setManagerId(currentManager.getId());
        flow.setStatus(newStatus);
        flow.setComment(request.getComment());
        flow.setActionDate(LocalDateTime.now());
        ApprovalFlow savedFlow = this.approvalRepository.save(flow);

        if (savedFlow.getStatus() == Status.REJECTED){
            detail.setStatus(Status.REJECTED);
        }

        detail.setUpdatedAt(LocalDateTime.now());
        this.travelRequestRepository.save(detail);

        this.auditService.log(
                AuditEntityType.APPROVAL_FLOW,
                flow.getId(),
                "UPDATE_APPROVAL_STATUS",
                "Manager updated travel request id=" + id
                        + ", status=" + newStatus
                        + ", comment=" + request.getComment()
        );

        return this.globalMessage.GlobalMessageHandler(true, "Status has been updated!", HttpStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<AllPendingResponse> getPendingApprovals() {
        User currentManager = getCurrentManager();

        List<TravelDetail> pendingTravels = this.approvalRepository
                .findByManagerIdAndStatus(currentManager.getId(), Status.PENDING)
                .stream()
                .map(ApprovalFlow::getTravelDetail)
                .filter(Objects::nonNull)
                .filter(detail -> detail.getStatus() == Status.PENDING)
                .toList();

        List<Long> flaggedTravelIds = pendingTravels.stream()
                .filter(detail -> Boolean.TRUE.equals(detail.getIsFlagged()))
                .map(TravelDetail::getId)
                .toList();

        Map<Long, List<FlaggedPolicyResponse>> flagsByTravelId = flaggedTravelIds.isEmpty()
                ? Collections.emptyMap()
                : this.travelPolicyFlagRepository.findByTravelDetail_IdIn(flaggedTravelIds)
                        .stream()
                        .collect(Collectors.groupingBy(
                                flag -> flag.getTravelDetail().getId(),
                                Collectors.mapping(this::toFlaggedPolicyResponse, Collectors.toList())
                        ));

        Map<Long, String> departmentNamesById = loadDepartmentNames(
                pendingTravels.stream().map(TravelDetail::getUser).toList()
        );

        return pendingTravels.stream()
                .map(detail -> toPendingResponse(detail, flagsByTravelId, departmentNamesById))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeam() {
        User currentManager = getCurrentManager();
        List<User> team = this.userRepository.findByManagerId(currentManager.getId());
        Map<Long, String> departmentNamesById = loadDepartmentNames(team);

        return team.stream()
                .map(member -> TeamMemberResponse.builder()
                        .id(member.getId())
                        .name(member.getName())
                        .email(member.getEmail())
                        .designation(member.getDesignation())
                        .departmentName(member.getDepartmentId() != null
                                ? departmentNamesById.getOrDefault(member.getDepartmentId(), "Not assigned")
                                : "Not assigned")
                        .build())
                .toList();
    }

    @Transactional
    public ResponseEntity<GlobalResponse> assignTravel(AssignTravelRequest request) {
        User currentManager = getCurrentManager();

        User employee = this.userRepository.findById(request.getUserId()).orElse(null);
        if (employee == null) {
            return this.globalMessage.GlobalMessageHandler(false, "Employee not found!", HttpStatus.NOT_FOUND);
        }

        if (!currentManager.getId().equals(employee.getManagerId())) {
            return this.globalMessage.GlobalMessageHandler(false, "You can only assign travel to your direct reports!", HttpStatus.FORBIDDEN);
        }

        if (request.getTravelStartDate().isBefore(LocalDate.now())) {
            return this.globalMessage.GlobalMessageHandler(false, "Travel start date cannot be in the past!", HttpStatus.BAD_REQUEST);
        }

        TravelClass parsedClass = (request.getTravelClass() != null && !request.getTravelClass().isBlank())
                ? TravelClass.valueOf(request.getTravelClass().trim().toUpperCase())
                : null;

        TravelDetail travelDetail = TravelDetail.builder()
                .user(employee)
                .destination(request.getDestination())
                .purpose(request.getPurpose())
                .travelClass(parsedClass)
                .status(Status.APPROVED)
                .stay(request.getStay())
                .travelStartDate(request.getTravelStartDate())
                .estimatedBudget(request.getEstimatedBudget())
                .isFlagged(false)
                .build();

        TravelDetail savedTravel = this.travelRequestRepository.save(travelDetail);

        ApprovalFlow flow = ApprovalFlow.builder()
                .travelDetail(savedTravel)
                .managerId(currentManager.getId())
                .status(Status.APPROVED)
                .comment(request.getComment())
                .actionDate(LocalDateTime.now())
                .build();

        ApprovalFlow savedFlow = this.approvalRepository.save(flow);
        savedTravel.setApprovalFlow(savedFlow);

        this.auditService.log(
                AuditEntityType.TRAVEL_DETAIL,
                savedTravel.getId(),
                "ASSIGN_TRAVEL",
                "Manager assigned travel to employeeId=" + employee.getId()
                        + ", destination=" + savedTravel.getDestination()
                        + ", budget=" + savedTravel.getEstimatedBudget()
        );

        return this.globalMessage.GlobalMessageHandler(true, "Travel assigned and approved successfully!", HttpStatus.CREATED);
    }

    @Transactional(readOnly = true)
    public ManagerTravelDetailResponse getTravelRequestById(Long id) {
        User currentManager = getCurrentManager();

        TravelDetail detail = this.travelRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Travel request not found!"));

        User employee = detail.getUser();
        ApprovalFlow flow = detail.getApprovalFlow();

        boolean isAssignedApprover = flow != null && currentManager.getId().equals(flow.getManagerId());
        boolean isDirectManager = employee != null && currentManager.getId().equals(employee.getManagerId());

        if (!isAssignedApprover && !isDirectManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not authorized to view this travel request!");
        }

        if (detail.getStatus() == Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot inspect a request that is still in DRAFT!");
        }

        String departmentName = "Not assigned";
        if (employee != null && employee.getDepartmentId() != null) {
            departmentName = this.departmentRepository.findById(employee.getDepartmentId())
                    .map(Department::getDepartmentName)
                    .orElse("Not assigned");
        }

        boolean flagged = Boolean.TRUE.equals(detail.getIsFlagged());
        List<FlaggedPolicyResponse> flaggedPolicies = flagged
                ? this.travelPolicyFlagRepository.findByTravelDetail_IdIn(List.of(detail.getId()))
                        .stream()
                        .map(this::toFlaggedPolicyResponse)
                        .toList()
                : Collections.emptyList();

        return ManagerTravelDetailResponse.builder()
                .id(detail.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeName(employee != null ? employee.getName() : null)
                .employeeEmail(employee != null ? employee.getEmail() : null)
                .employeeDesignation(employee != null ? employee.getDesignation() : null)
                .departmentName(departmentName)
                .destination(detail.getDestination())
                .purpose(detail.getPurpose())
                .travelClass(detail.getTravelClass() != null ? detail.getTravelClass().name() : null)
                .status(detail.getStatus() != null ? detail.getStatus().name() : null)
                .stay(detail.getStay())
                .travelStartDate(detail.getTravelStartDate())
                .estimatedBudget(detail.getEstimatedBudget())
                .isFlagged(flagged)
                .createdAt(detail.getCreatedAt())
                .approvalStatus(flow != null && flow.getStatus() != null ? flow.getStatus().name() : null)
                .approvalComment(flow != null ? flow.getComment() : null)
                .actionDate(flow != null ? flow.getActionDate() : null)
                .flaggedPolicies(flaggedPolicies)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ManagerHistoryResponse> getApprovalHistory() {
        User currentManager = getCurrentManager();

        return this.approvalRepository
                .findByManagerIdAndStatusInOrderByActionDateDesc(
                        currentManager.getId(),
                        List.of(Status.APPROVED, Status.REJECTED)
                )
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    private ManagerHistoryResponse toHistoryResponse(ApprovalFlow flow) {
        TravelDetail detail = flow.getTravelDetail();
        User employee = detail != null ? detail.getUser() : null;

        return ManagerHistoryResponse.builder()
                .id(flow.getId())
                .travelId(detail != null ? detail.getId() : null)
                .employeeName(employee != null ? employee.getName() : null)
                .destination(detail != null ? detail.getDestination() : null)
                .purpose(detail != null ? detail.getPurpose() : null)
                .estimatedBudget(detail != null ? detail.getEstimatedBudget() : null)
                .status(flow.getStatus() != null ? flow.getStatus().name() : null)
                .comment(flow.getComment())
                .actionDate(flow.getActionDate())
                .build();
    }

    private User getCurrentManager() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return this.userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Authenticated manager not found!"));
    }

    private Map<Long, String> loadDepartmentNames(Collection<User> users) {
        Set<Long> departmentIds = users.stream()
                .filter(Objects::nonNull)
                .map(User::getDepartmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (departmentIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return this.departmentRepository.findAllById(departmentIds)
                .stream()
                .filter(dept -> dept.getDepartmentName() != null)
                .collect(Collectors.toMap(
                        Department::getDeptId,
                        Department::getDepartmentName
                ));
    }

    private AllPendingResponse toPendingResponse(TravelDetail detail,
                                                 Map<Long, List<FlaggedPolicyResponse>> flagsByTravelId,
                                                 Map<Long, String> departmentNamesById) {
        boolean flagged = Boolean.TRUE.equals(detail.getIsFlagged());
        List<FlaggedPolicyResponse> flaggedPolicies = flagged
                ? flagsByTravelId.getOrDefault(detail.getId(), Collections.emptyList())
                : Collections.emptyList();

        User employee = detail.getUser();
        String employeeName = employee != null ? employee.getName() : null;
        String employeeDesignation = employee != null ? employee.getDesignation() : null;
        String departmentName = (employee != null && employee.getDepartmentId() != null)
                ? departmentNamesById.getOrDefault(employee.getDepartmentId(), "Not assigned")
                : "Not assigned";

        return AllPendingResponse.builder()
                .id(detail.getId())
                .employeeName(employeeName)
                .employeeDesignation(employeeDesignation)
                .departmentName(departmentName)
                .destination(detail.getDestination())
                .purpose(detail.getPurpose())
                .travelClass(detail.getTravelClass() != null ? detail.getTravelClass().name() : null)
                .status(detail.getStatus() != null ? detail.getStatus().name() : null)
                .stay(detail.getStay())
                .travelStartDate(detail.getTravelStartDate())
                .estimatedBudget(detail.getEstimatedBudget())
                .isFlagged(flagged)
                .createdAt(detail.getCreatedAt())
                .flaggedPolicies(flaggedPolicies)
                .build();
    }

    private FlaggedPolicyResponse toFlaggedPolicyResponse(TravelPolicyFlag flag) {
        return FlaggedPolicyResponse.builder()
                .id(flag.getId())
                .policyId(flag.getPolicy() != null ? flag.getPolicy().getId() : null)
                .policyName(flag.getPolicyName())
                .policyType(flag.getPolicyType() != null ? flag.getPolicyType().name() : null)
                .justification(flag.getJustification())
                .build();
    }
}
