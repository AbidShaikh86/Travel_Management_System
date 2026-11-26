package com.project.backend.service;

import com.project.backend.DTO.Employee.TravelResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.model.ApprovalFlow;
import com.project.backend.model.Department;
import com.project.backend.model.Enumerator.PolicyType;
import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Enumerator.TravelClass;
import com.project.backend.model.Expense;
import com.project.backend.model.Policy;
import com.project.backend.model.Reimbursement;
import com.project.backend.model.TravelDetail;
import com.project.backend.model.TravelPolicyFlag;
import com.project.backend.model.User;
import com.project.backend.repository.DepartmentRepository;
import com.project.backend.repository.ExpenseRepository;
import com.project.backend.repository.ReimbursementRepository;
import com.project.backend.repository.TravelPolicyFlagRepository;
import com.project.backend.repository.TravelRequestRepository;
import com.project.backend.util.GlobalMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceServiceTest {

    @Mock
    private TravelRequestRepository travelRequestRepository;
    @Mock
    private ReimbursementRepository reimbursementRepository;
    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private TravelPolicyFlagRepository travelPolicyFlagRepository;
    @Mock
    private GlobalMessage globalMessage;

    @InjectMocks
    private FinanceService financeService;

    @Test
    void getAllTravelRequest_mapsNonDraftRequestsWithManagerApproval() {
        ApprovalFlow flow = ApprovalFlow.builder()
                .id(10L)
                .status(Status.APPROVED)
                .build();

        TravelDetail detail = TravelDetail.builder()
                .id(5L)
                .destination("Mumbai")
                .purpose("Client Workshop")
                .travelClass(TravelClass.FLIGHT_ECONOMY)
                .status(Status.APPROVED)
                .stay(3)
                .travelStartDate(LocalDate.of(2026, 12, 12))
                .estimatedBudget(15000.0)
                .isFlagged(true)
                .approvalFlow(flow)
                .createdAt(LocalDateTime.of(2026, 11, 25, 11, 0))
                .build();

        when(travelRequestRepository.findAllWithApprovalFlowByStatusNot(Status.DRAFT))
                .thenReturn(List.of(detail));

        List<TravelResponse> responses = financeService.getAllTravelRequest();

        assertEquals(1, responses.size());
        TravelResponse item = responses.get(0);
        assertEquals(5L, item.getId());
        assertEquals("Mumbai", item.getDestination());
        assertEquals("FLIGHT_ECONOMY", item.getTravelClass());
        assertEquals("APPROVED", item.getStatus());
        assertEquals("APPROVED", item.getManagerApproval());
        assertTrue(item.getIsFlagged());
    }

    @Test
    void getTravelRequestById_returnsFullDetailForFinanceWithoutManagerOwnershipCheck() {
        User employee = User.builder()
                .id(21L)
                .name("Farhan Gheri")
                .email("farhan@company.com")
                .designation("Staff Engineer")
                .departmentId(4L)
                .managerId(99L)
                .build();

        ApprovalFlow flow = ApprovalFlow.builder()
                .id(12L)
                .managerId(99L)
                .status(Status.APPROVED)
                .comment("Approved for summit")
                .actionDate(LocalDateTime.of(2026, 11, 25, 14, 0))
                .build();

        TravelDetail detail = TravelDetail.builder()
                .id(19L)
                .user(employee)
                .approvalFlow(flow)
                .destination("Pune")
                .purpose("Client site visit")
                .travelClass(TravelClass.TRAIN_FIRST_AC)
                .status(Status.APPROVED)
                .stay(2)
                .travelStartDate(LocalDate.of(2026, 12, 15))
                .estimatedBudget(9000.0)
                .isFlagged(true)
                .createdAt(LocalDateTime.of(2026, 11, 24, 9, 0))
                .build();

        Policy policy = Policy.builder().id(3L).name("Rail Cap").type(PolicyType.BUDGET_LIMIT).build();
        TravelPolicyFlag flag = TravelPolicyFlag.builder()
                .id(44L)
                .travelDetail(detail)
                .policy(policy)
                .policyName("Rail Cap")
                .policyType(PolicyType.BUDGET_LIMIT)
                .justification("Peak season fare")
                .build();

        when(travelRequestRepository.findById(19L)).thenReturn(Optional.of(detail));
        when(departmentRepository.findById(4L))
                .thenReturn(Optional.of(Department.builder().deptId(4L).departmentName("Platform").build()));
        when(travelPolicyFlagRepository.findByTravelDetail_IdIn(List.of(19L))).thenReturn(List.of(flag));

        ManagerTravelDetailResponse result = financeService.getTravelRequestById(19L);

        assertEquals(19L, result.getId());
        assertEquals("Farhan Gheri", result.getEmployeeName());
        assertEquals("farhan@company.com", result.getEmployeeEmail());
        assertEquals("Staff Engineer", result.getEmployeeDesignation());
        assertEquals("Platform", result.getDepartmentName());
        assertEquals("APPROVED", result.getApprovalStatus());
        assertEquals("Approved for summit", result.getApprovalComment());
        assertEquals(1, result.getFlaggedPolicies().size());
        assertEquals("Peak season fare", result.getFlaggedPolicies().get(0).getJustification());
    }

    @Test
    void getTravelRequestById_throwsBadRequestForDraftRequest() {
        TravelDetail draft = TravelDetail.builder()
                .id(88L)
                .status(Status.DRAFT)
                .build();

        when(travelRequestRepository.findById(88L)).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> financeService.getTravelRequestById(88L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void getReimbursementById_throwsNotFoundWhenMissing() {
        when(reimbursementRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> financeService.getReimbursementById(99L));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void getReimbursementById_throwsBadRequestForDraftReimbursement() {
        Reimbursement draft = Reimbursement.builder()
                .id(77L)
                .status(ReimbursementStatus.DRAFT)
                .build();

        when(reimbursementRepository.findById(77L)).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> financeService.getReimbursementById(77L));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void getReimbursementById_handlesNullableAssociationsSafely() {
        User employee = User.builder()
                .id(1L)
                .name("Test User")
                .email("test@company.com")
                .build();

        Reimbursement reimbursement = Reimbursement.builder()
                .id(12L)
                .user(employee)
                .status(ReimbursementStatus.PENDING)
                .build();

        Expense expense = Expense.builder()
                .id(31L)
                .amount(250.0)
                .build();

        when(reimbursementRepository.findById(12L)).thenReturn(Optional.of(reimbursement));
        when(expenseRepository.findAllByReimbursementId(12L)).thenReturn(List.of(expense));

        ReimbursementResponse response = financeService.getReimbursementById(12L);

        assertEquals(12L, response.getId());
        assertEquals("Test User", response.getEmployeeName());
        assertEquals(250.0, response.getTotalAmount());
        assertEquals(1, response.getExpenses().size());
    }
}
