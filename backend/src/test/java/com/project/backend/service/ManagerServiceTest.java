package com.project.backend.service;

import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.AllPendingResponse;
import com.project.backend.DTO.Manager.AssignTravelRequest;
import com.project.backend.DTO.Manager.ManagerHistoryResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.Manager.TeamMemberResponse;
import com.project.backend.model.ApprovalFlow;
import com.project.backend.model.Department;
import com.project.backend.model.Enumerator.PolicyType;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Enumerator.TravelClass;
import com.project.backend.model.Policy;
import com.project.backend.model.TravelDetail;
import com.project.backend.model.TravelPolicyFlag;
import com.project.backend.model.User;
import com.project.backend.repository.ApprovalRepository;
import com.project.backend.repository.DepartmentRepository;
import com.project.backend.repository.TravelPolicyFlagRepository;
import com.project.backend.repository.TravelRequestRepository;
import com.project.backend.repository.UserRepository;
import com.project.backend.util.GlobalMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagerServiceTest {

    @Mock
    private ApprovalRepository approvalRepository;
    @Mock
    private TravelRequestRepository travelRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TravelPolicyFlagRepository travelPolicyFlagRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private GlobalMessage globalMessage;

    @InjectMocks
    private ManagerService managerService;

    private User manager;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id(10L)
                .email("manager@example.com")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager@example.com", "pw")
        );
        when(userRepository.findByEmail("manager@example.com")).thenReturn(Optional.of(manager));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getPendingApprovals_attachesFlaggedPoliciesOnlyForFlaggedRequests() {
        User flaggedEmployee = User.builder()
                .id(11L)
                .name("Aarav Mehta")
                .designation("Senior Engineer")
                .departmentId(20L)
                .build();

        User cleanEmployee = User.builder()
                .id(12L)
                .name("Priya Shah")
                .designation("Analyst")
                .departmentId(null)
                .build();

        TravelDetail flaggedTravel = TravelDetail.builder()
                .id(1L)
                .user(flaggedEmployee)
                .destination("Godhra")
                .purpose("Client Meeting")
                .travelClass(TravelClass.FLIGHT_BUSINESS)
                .status(Status.PENDING)
                .stay(5)
                .travelStartDate(LocalDate.of(2026, 12, 1))
                .estimatedBudget(15000.0)
                .isFlagged(true)
                .createdAt(LocalDateTime.now())
                .build();

        TravelDetail cleanTravel = TravelDetail.builder()
                .id(2L)
                .user(cleanEmployee)
                .destination("Pune")
                .purpose("Workshop")
                .travelClass(TravelClass.TRAIN_SECOND_AC)
                .status(Status.PENDING)
                .stay(2)
                .travelStartDate(LocalDate.of(2026, 12, 5))
                .estimatedBudget(3000.0)
                .isFlagged(false)
                .createdAt(LocalDateTime.now())
                .build();

        ApprovalFlow flaggedFlow = ApprovalFlow.builder()
                .id(100L)
                .managerId(manager.getId())
                .status(Status.PENDING)
                .travelDetail(flaggedTravel)
                .build();

        ApprovalFlow cleanFlow = ApprovalFlow.builder()
                .id(101L)
                .managerId(manager.getId())
                .status(Status.PENDING)
                .travelDetail(cleanTravel)
                .build();

        Policy budgetPolicy = Policy.builder().id(5L).name("Budget Cap").type(PolicyType.BUDGET_LIMIT).build();
        Policy classPolicy = Policy.builder().id(6L).name("Business Class Restriction").type(PolicyType.TRAVEL_CLASS).build();

        TravelPolicyFlag flag1 = TravelPolicyFlag.builder()
                .id(50L)
                .travelDetail(flaggedTravel)
                .policy(budgetPolicy)
                .policyName("Budget Cap")
                .policyType(PolicyType.BUDGET_LIMIT)
                .justification("Urgent executive visit")
                .build();

        TravelPolicyFlag flag2 = TravelPolicyFlag.builder()
                .id(51L)
                .travelDetail(flaggedTravel)
                .policy(classPolicy)
                .policyName("Business Class Restriction")
                .policyType(PolicyType.TRAVEL_CLASS)
                .justification("Urgent executive visit")
                .build();

        when(approvalRepository.findByManagerIdAndStatus(manager.getId(), Status.PENDING))
                .thenReturn(List.of(flaggedFlow, cleanFlow));
        when(travelPolicyFlagRepository.findByTravelDetail_IdIn(List.of(1L)))
                .thenReturn(List.of(flag1, flag2));
        when(departmentRepository.findAllById(Set.of(20L)))
                .thenReturn(List.of(Department.builder().deptId(20L).departmentName("Engineering").build()));

        List<AllPendingResponse> result = managerService.getPendingApprovals();

        assertEquals(2, result.size());

        AllPendingResponse first = result.get(0);
        assertEquals(1L, first.getId());
        assertEquals("Aarav Mehta", first.getEmployeeName());
        assertEquals("Senior Engineer", first.getEmployeeDesignation());
        assertEquals("Engineering", first.getDepartmentName());
        assertTrue(first.getIsFlagged());
        assertEquals(2, first.getFlaggedPolicies().size());
        assertEquals("Budget Cap", first.getFlaggedPolicies().get(0).getPolicyName());
        assertEquals("BUDGET_LIMIT", first.getFlaggedPolicies().get(0).getPolicyType());
        assertEquals(5L, first.getFlaggedPolicies().get(0).getPolicyId());
        assertEquals("Urgent executive visit", first.getFlaggedPolicies().get(0).getJustification());
        assertEquals("Business Class Restriction", first.getFlaggedPolicies().get(1).getPolicyName());

        AllPendingResponse second = result.get(1);
        assertEquals(2L, second.getId());
        assertEquals("Priya Shah", second.getEmployeeName());
        assertEquals("Analyst", second.getEmployeeDesignation());
        assertEquals("Not assigned", second.getDepartmentName());
        assertFalse(second.getIsFlagged());
        assertTrue(second.getFlaggedPolicies().isEmpty());
    }

    @Test
    void getPendingApprovals_skipsFlagQueryWhenNoneFlagged() {
        TravelDetail cleanTravel = TravelDetail.builder()
                .id(2L)
                .destination("Pune")
                .purpose("Workshop")
                .status(Status.PENDING)
                .isFlagged(false)
                .build();

        ApprovalFlow cleanFlow = ApprovalFlow.builder()
                .id(101L)
                .managerId(manager.getId())
                .status(Status.PENDING)
                .travelDetail(cleanTravel)
                .build();

        when(approvalRepository.findByManagerIdAndStatus(manager.getId(), Status.PENDING))
                .thenReturn(List.of(cleanFlow));

        List<AllPendingResponse> result = managerService.getPendingApprovals();

        assertEquals(1, result.size());
        assertTrue(result.get(0).getFlaggedPolicies().isEmpty());
        verifyNoInteractions(travelPolicyFlagRepository);
        verifyNoInteractions(departmentRepository);
    }

    @Test
    void getTeam_returnsDirectReportsWithDepartmentNames() {
        User report1 = User.builder()
                .id(11L)
                .name("Aarav Mehta")
                .email("aarav@example.com")
                .designation("Senior Engineer")
                .managerId(manager.getId())
                .departmentId(20L)
                .build();

        User report2 = User.builder()
                .id(12L)
                .name("Priya Shah")
                .email("priya@example.com")
                .designation("Analyst")
                .managerId(manager.getId())
                .departmentId(null)
                .build();

        when(userRepository.findByManagerId(manager.getId())).thenReturn(List.of(report1, report2));
        when(departmentRepository.findAllById(Set.of(20L)))
                .thenReturn(List.of(Department.builder().deptId(20L).departmentName("Engineering").build()));

        List<TeamMemberResponse> team = managerService.getTeam();

        assertEquals(2, team.size());
        assertEquals(11L, team.get(0).getId());
        assertEquals("Aarav Mehta", team.get(0).getName());
        assertEquals("aarav@example.com", team.get(0).getEmail());
        assertEquals("Senior Engineer", team.get(0).getDesignation());
        assertEquals("Engineering", team.get(0).getDepartmentName());

        assertEquals(12L, team.get(1).getId());
        assertEquals("Not assigned", team.get(1).getDepartmentName());
    }

    @Test
    void assignTravel_createsApprovedTravelAndApprovalFlowForDirectReport() {
        User report = User.builder()
                .id(11L)
                .name("Aarav Mehta")
                .managerId(manager.getId())
                .build();

        AssignTravelRequest request = AssignTravelRequest.builder()
                .userId(11L)
                .destination("Mumbai")
                .travelClass("FLIGHT_ECONOMY")
                .travelStartDate(LocalDate.now().plusDays(5))
                .purpose("Client onboarding")
                .stay(3)
                .estimatedBudget(12000.0)
                .comment("Assigned by manager")
                .build();

        when(userRepository.findById(11L)).thenReturn(Optional.of(report));
        when(travelRequestRepository.save(any(TravelDetail.class))).thenAnswer(inv -> {
            TravelDetail td = inv.getArgument(0);
            td.setId(99L);
            return td;
        });
        when(approvalRepository.save(any(ApprovalFlow.class))).thenAnswer(inv -> inv.getArgument(0));
        when(globalMessage.GlobalMessageHandler(true, "Travel assigned and approved successfully!", HttpStatus.CREATED))
                .thenReturn(ResponseEntity.status(HttpStatus.CREATED)
                        .body(GlobalResponse.builder().process(true).message("Travel assigned and approved successfully!").build()));

        ResponseEntity<GlobalResponse> response = managerService.assignTravel(request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        ArgumentCaptor<TravelDetail> travelCaptor = ArgumentCaptor.forClass(TravelDetail.class);
        verify(travelRequestRepository).save(travelCaptor.capture());
        TravelDetail savedTravel = travelCaptor.getValue();
        assertEquals(report, savedTravel.getUser());
        assertEquals(Status.APPROVED, savedTravel.getStatus());
        assertEquals(TravelClass.FLIGHT_ECONOMY, savedTravel.getTravelClass());
        assertFalse(savedTravel.getIsFlagged());

        ArgumentCaptor<ApprovalFlow> flowCaptor = ArgumentCaptor.forClass(ApprovalFlow.class);
        verify(approvalRepository).save(flowCaptor.capture());
        ApprovalFlow savedFlow = flowCaptor.getValue();
        assertEquals(manager.getId(), savedFlow.getManagerId());
        assertEquals(Status.APPROVED, savedFlow.getStatus());
        assertEquals("Assigned by manager", savedFlow.getComment());
        assertNotNull(savedFlow.getActionDate());
    }

    @Test
    void assignTravel_rejectsEmployeeNotReportingToManager() {
        User otherEmployee = User.builder()
                .id(15L)
                .managerId(999L)
                .build();

        AssignTravelRequest request = AssignTravelRequest.builder()
                .userId(15L)
                .destination("Delhi")
                .travelStartDate(LocalDate.now().plusDays(2))
                .purpose("Summit")
                .stay(2)
                .estimatedBudget(8000.0)
                .build();

        when(userRepository.findById(15L)).thenReturn(Optional.of(otherEmployee));
        when(globalMessage.GlobalMessageHandler(false, "You can only assign travel to your direct reports!", HttpStatus.FORBIDDEN))
                .thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(GlobalResponse.builder().process(false).message("You can only assign travel to your direct reports!").build()));

        ResponseEntity<GlobalResponse> response = managerService.assignTravel(request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verifyNoInteractions(travelRequestRepository);
        verifyNoInteractions(approvalRepository);
    }

    @Test
    void getTravelRequestById_returnsFullDetailForAssignedManager() {
        User employee = User.builder()
                .id(11L)
                .name("Aarav Mehta")
                .email("aarav@example.com")
                .designation("Senior Engineer")
                .departmentId(20L)
                .managerId(manager.getId())
                .build();

        ApprovalFlow flow = ApprovalFlow.builder()
                .id(100L)
                .managerId(manager.getId())
                .status(Status.APPROVED)
                .comment("Approved for client visit")
                .actionDate(LocalDateTime.of(2026, 11, 25, 10, 0))
                .build();

        TravelDetail detail = TravelDetail.builder()
                .id(77L)
                .user(employee)
                .approvalFlow(flow)
                .destination("Bangalore")
                .purpose("Architecture review")
                .travelClass(TravelClass.FLIGHT_BUSINESS)
                .status(Status.APPROVED)
                .stay(4)
                .travelStartDate(LocalDate.of(2026, 12, 10))
                .estimatedBudget(18000.0)
                .isFlagged(true)
                .createdAt(LocalDateTime.of(2026, 11, 24, 9, 30))
                .build();

        Policy classPolicy = Policy.builder().id(6L).name("Business Class Restriction").type(PolicyType.TRAVEL_CLASS).build();
        TravelPolicyFlag flag = TravelPolicyFlag.builder()
                .id(51L)
                .travelDetail(detail)
                .policy(classPolicy)
                .policyName("Business Class Restriction")
                .policyType(PolicyType.TRAVEL_CLASS)
                .justification("Long-haul executive trip")
                .build();

        when(travelRequestRepository.findById(77L)).thenReturn(Optional.of(detail));
        when(departmentRepository.findById(20L))
                .thenReturn(Optional.of(Department.builder().deptId(20L).departmentName("Engineering").build()));
        when(travelPolicyFlagRepository.findByTravelDetail_IdIn(List.of(77L))).thenReturn(List.of(flag));

        ManagerTravelDetailResponse result = managerService.getTravelRequestById(77L);

        assertEquals(77L, result.getId());
        assertEquals(11L, result.getEmployeeId());
        assertEquals("Aarav Mehta", result.getEmployeeName());
        assertEquals("aarav@example.com", result.getEmployeeEmail());
        assertEquals("Senior Engineer", result.getEmployeeDesignation());
        assertEquals("Engineering", result.getDepartmentName());
        assertEquals("APPROVED", result.getApprovalStatus());
        assertEquals("Approved for client visit", result.getApprovalComment());
        assertEquals(1, result.getFlaggedPolicies().size());
        assertEquals("Long-haul executive trip", result.getFlaggedPolicies().get(0).getJustification());
    }

    @Test
    void getTravelRequestById_throwsForbiddenForUnrelatedManager() {
        User otherEmployee = User.builder().id(15L).managerId(999L).build();
        ApprovalFlow otherFlow = ApprovalFlow.builder().managerId(999L).status(Status.PENDING).build();
        TravelDetail detail = TravelDetail.builder()
                .id(78L)
                .user(otherEmployee)
                .approvalFlow(otherFlow)
                .status(Status.PENDING)
                .build();

        when(travelRequestRepository.findById(78L)).thenReturn(Optional.of(detail));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> managerService.getTravelRequestById(78L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getTravelRequestById_throwsBadRequestForDraftRequest() {
        User employee = User.builder().id(11L).managerId(manager.getId()).build();
        ApprovalFlow flow = ApprovalFlow.builder().managerId(manager.getId()).status(Status.DRAFT).build();
        TravelDetail detail = TravelDetail.builder()
                .id(79L)
                .user(employee)
                .approvalFlow(flow)
                .status(Status.DRAFT)
                .build();

        when(travelRequestRepository.findById(79L)).thenReturn(Optional.of(detail));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> managerService.getTravelRequestById(79L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void getApprovalHistory_returnsApprovedAndRejectedOrderedByActionDateDesc() {
        User employee1 = User.builder().id(11L).name("Aarav Mehta").build();
        User employee2 = User.builder().id(12L).name("Priya Shah").build();

        TravelDetail travel1 = TravelDetail.builder()
                .id(70L)
                .user(employee1)
                .destination("Mumbai")
                .purpose("Client visit")
                .estimatedBudget(15000.0)
                .build();

        TravelDetail travel2 = TravelDetail.builder()
                .id(71L)
                .user(employee2)
                .destination("Goa")
                .purpose("Conference")
                .estimatedBudget(22000.0)
                .build();

        ApprovalFlow newer = ApprovalFlow.builder()
                .id(201L)
                .travelDetail(travel1)
                .managerId(manager.getId())
                .status(Status.APPROVED)
                .comment("Approved")
                .actionDate(LocalDateTime.of(2026, 11, 26, 10, 0))
                .build();

        ApprovalFlow older = ApprovalFlow.builder()
                .id(200L)
                .travelDetail(travel2)
                .managerId(manager.getId())
                .status(Status.REJECTED)
                .comment("Over budget")
                .actionDate(LocalDateTime.of(2026, 11, 25, 14, 30))
                .build();

        when(approvalRepository.findByManagerIdAndStatusInOrderByActionDateDesc(
                manager.getId(), List.of(Status.APPROVED, Status.REJECTED)))
                .thenReturn(List.of(newer, older));

        List<ManagerHistoryResponse> history = managerService.getApprovalHistory();

        assertEquals(2, history.size());
        assertEquals(201L, history.get(0).getId());
        assertEquals(70L, history.get(0).getTravelId());
        assertEquals("Aarav Mehta", history.get(0).getEmployeeName());
        assertEquals("Mumbai", history.get(0).getDestination());
        assertEquals("Client visit", history.get(0).getPurpose());
        assertEquals(15000.0, history.get(0).getEstimatedBudget());
        assertEquals("APPROVED", history.get(0).getStatus());
        assertEquals("Approved", history.get(0).getComment());
        assertEquals(LocalDateTime.of(2026, 11, 26, 10, 0), history.get(0).getActionDate());

        assertEquals(200L, history.get(1).getId());
        assertEquals(71L, history.get(1).getTravelId());
        assertEquals("REJECTED", history.get(1).getStatus());
    }
}
