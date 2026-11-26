package com.project.backend.service;

import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.model.ApprovalFlow;
import com.project.backend.model.Enumerator.ExpenseCategory;
import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.model.Expense;
import com.project.backend.model.ExpenseProof;
import com.project.backend.model.Reimbursement;
import com.project.backend.model.TravelDetail;
import com.project.backend.model.User;
import com.project.backend.repository.ExpenseProofRepository;
import com.project.backend.repository.ExpenseRepository;
import com.project.backend.repository.ReimbursementRepository;
import com.project.backend.repository.TravelRequestRepository;
import com.project.backend.repository.UserRepository;
import com.project.backend.util.GlobalMessage;
import com.project.backend.util.StoreFile;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReimbursementServiceTest {

    @Mock
    private ReimbursementRepository reimbursementRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TravelRequestRepository travelRequestRepository;
    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private ExpenseProofRepository expenseProofRepository;
    @Mock
    private StoreFile storeFile;
    @Mock
    private GlobalMessage globalMessage;

    @InjectMocks
    private ReimbursementService reimbursementService;

    private User employee;

    @BeforeEach
    void setUp() {
        employee = User.builder()
                .id(7L)
                .name("Farhan Gheri")
                .email("farhan@company.com")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("farhan@company.com", "pw")
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getMyReimbursements_returnsDtoListWithoutCircularReferences() throws Exception {
        ApprovalFlow flow = ApprovalFlow.builder()
                .id(11L)
                .status(Status.APPROVED)
                .build();

        TravelDetail travel = TravelDetail.builder()
                .id(22L)
                .user(employee)
                .destination("Mumbai")
                .travelStartDate(LocalDate.of(2026, 12, 1))
                .approvalFlow(flow)
                .build();
        flow.setTravelDetail(travel);

        Reimbursement reimbursement = Reimbursement.builder()
                .id(33L)
                .user(employee)
                .travelDetail(travel)
                .status(ReimbursementStatus.PENDING)
                .comment("Client summit")
                .createdAt(LocalDateTime.of(2026, 11, 26, 10, 0))
                .build();

        ExpenseProof proof = ExpenseProof.builder()
                .id(44L)
                .reimbursement(reimbursement)
                .originalFileName("cab.pdf")
                .filePath("/api/files/33/uuid-cab.pdf")
                .build();

        Expense expense = Expense.builder()
                .id(55L)
                .reimbursement(reimbursement)
                .category(ExpenseCategory.TRANSPORT)
                .amount(1250.0)
                .expenseProof(proof)
                .createdAt(LocalDateTime.of(2026, 11, 26, 10, 5))
                .build();

        reimbursement.setExpenses(List.of(expense));

        when(userRepository.findByEmail("farhan@company.com")).thenReturn(Optional.of(employee));
        when(reimbursementRepository.findByUserId(7L)).thenReturn(List.of(reimbursement));

        List<ReimbursementResponse> result = reimbursementService.getMyReimbursements();

        assertEquals(1, result.size());
        ReimbursementResponse item = result.get(0);
        assertEquals(33L, item.getId());
        assertEquals("Farhan Gheri", item.getEmployeeName());
        assertEquals("farhan@company.com", item.getEmployeeEmail());
        assertEquals(22L, item.getTravelDetailId());
        assertEquals("Mumbai", item.getTravelDestination());
        assertEquals(LocalDate.of(2026, 12, 1), item.getTravelStartDate());
        assertEquals(1250.0, item.getTotalAmount());
        assertEquals(1, item.getExpenses().size());
        assertEquals("cab.pdf", item.getExpenses().get(0).getProofFileName());
        assertEquals("/api/files/33/uuid-cab.pdf", item.getExpenses().get(0).getProofUrl());

        String json = new ObjectMapper().writeValueAsString(result);
        assertTrue(json.contains("\"travelDestination\":\"Mumbai\""));
        assertFalse(json.contains("\"approvalFlow\""));
    }
}
