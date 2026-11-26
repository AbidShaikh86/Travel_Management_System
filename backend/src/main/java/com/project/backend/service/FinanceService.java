package com.project.backend.service;

import com.project.backend.DTO.Employee.TravelResponse;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.FlaggedPolicyResponse;
import com.project.backend.DTO.Manager.ManagerTravelDetailResponse;
import com.project.backend.DTO.reimbursement.ExpenseResponse;
import com.project.backend.DTO.Finance.FinanceBudgetRequest;
import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.model.*;
import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.repository.*;
import com.project.backend.util.GlobalMessage;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
public class FinanceService {

    private final TravelRequestRepository travelRequestRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final DepartmentRepository departmentRepository;
    private final TravelPolicyFlagRepository travelPolicyFlagRepository;
    private final ExpenseRepository expenseRepository;
    private final GlobalMessage globalMessage;

    public FinanceService(TravelRequestRepository travelRequestRepository,
                          ReimbursementRepository reimbursementRepository,
                          DepartmentRepository departmentRepository,
                          TravelPolicyFlagRepository travelPolicyFlagRepository, ExpenseRepository expenseRepository,
                          GlobalMessage globalMessage){
        this.travelRequestRepository = travelRequestRepository;
        this.reimbursementRepository = reimbursementRepository;
        this.departmentRepository = departmentRepository;
        this.travelPolicyFlagRepository = travelPolicyFlagRepository;
        this.expenseRepository = expenseRepository;
        this.globalMessage = globalMessage;
    }

    @Transactional
    public ResponseEntity<GlobalResponse> travelBudgetStatusUpdate(Long id, FinanceBudgetRequest financeBudgetRequest) {
        TravelDetail travelDetail = this.travelRequestRepository.findById(id)
                .orElseThrow(RuntimeException::new);

        if (travelDetail.getStatus() == Status.COMPLETED || travelDetail.getStatus() == Status.CANCELLED) {
            return this.globalMessage.GlobalMessageHandler(false, "Cannot modify completed or cancelled travel requests!", HttpStatus.CONFLICT);
        }

        if (travelDetail.getApprovalFlow() == null || travelDetail.getApprovalFlow().getStatus() != Status.APPROVED) {
            return this.globalMessage.GlobalMessageHandler(false, "Request must be approved by Manager before Finance action!", HttpStatus.BAD_REQUEST);
        }

        travelDetail.setEstimatedBudget(financeBudgetRequest.getBudget());
        travelDetail.setStatus(Status.valueOf(financeBudgetRequest.getStatus()));
        travelDetail.setUpdatedAt(LocalDateTime.now());

        this.travelRequestRepository.save(travelDetail);
        return this.globalMessage.GlobalMessageHandler(true, "Status has been updated!", HttpStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<ReimbursementResponse> getAllReimbursementRequest() {
        List<Reimbursement> reimbursementList = this.reimbursementRepository.findByStatusNot(ReimbursementStatus.DRAFT);
        return reimbursementList.stream().map(reim -> {
            List<ExpenseResponse> expenseResponses = reim.getExpenses() != null
                    ? reim.getExpenses().stream().map(exp -> {
                        ExpenseProof proof = exp.getExpenseProof();
                        return ExpenseResponse.builder()
                                .id(exp.getId())
                                .category(exp.getCategory() != null ? exp.getCategory().name() : null)
                                .amount(exp.getAmount())
                                .proofFileName(proof != null ? proof.getFilePath() : null)
                                .proofUrl(proof != null ? proof.getFilePath() : null)
                                .createdAt(exp.getCreatedAt())
                                .build();
                    }).toList()
                    : List.of();

            return toReimbursementResponse(reim, expenseResponses);
        }).toList();
    }

    @Transactional(readOnly = true)
    public ReimbursementResponse getReimbursementById(Long id){
        Reimbursement reimbursement = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reimbursement request not found!"));

        if (reimbursement.getStatus() == ReimbursementStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot inspect a reimbursement that is still in DRAFT!");
        }

        List<Expense> expenseList = this.expenseRepository.findAllByReimbursementId(reimbursement.getId());
        List<ExpenseResponse> expenseResponseList = expenseList.stream().map(expense -> {
            ExpenseProof proof = expense.getExpenseProof();
            return ExpenseResponse.builder()
                    .id(expense.getId())
                    .category(expense.getCategory() != null ? expense.getCategory().name() : null)
                    .amount(expense.getAmount())
                    .proofFileName(proof != null ? proof.getOriginalFileName() : null)
                    .proofUrl(proof != null ? proof.getFilePath() : null)
                    .createdAt(expense.getCreatedAt())
                    .build();
        }).toList();

        return toReimbursementResponse(reimbursement, expenseResponseList);
    }

    private ReimbursementResponse toReimbursementResponse(Reimbursement reimbursement, List<ExpenseResponse> expenseResponses) {
        Double totalAmount = expenseResponses.stream()
                .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                .sum();

        User employee = reimbursement.getUser();
        TravelDetail travel = reimbursement.getTravelDetail();
        return ReimbursementResponse.builder()
                .id(reimbursement.getId())
                .employeeName(employee != null ? employee.getName() : null)
                .employeeEmail(employee != null ? employee.getEmail() : null)
                .travelDetailId(travel != null ? travel.getId() : null)
                .travelDestination(travel != null ? travel.getDestination() : null)
                .travelStartDate(travel != null ? travel.getTravelStartDate() : null)
                .status(reimbursement.getStatus() != null ? reimbursement.getStatus().name() : null)
                .comment(reimbursement.getComment())
                .totalAmount(totalAmount)
                .createdAt(reimbursement.getCreatedAt())
                .processedAt(reimbursement.getProcessedAt())
                .expenses(expenseResponses)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TravelResponse> getAllTravelRequest() {
        List<TravelDetail> detailList =
                this.travelRequestRepository.findAllWithApprovalFlowByStatusNot(Status.DRAFT);

        return detailList.stream().map(list -> {
            return TravelResponse.builder()
                    .id(list.getId())
                    .destination(list.getDestination())
                    .purpose(list.getPurpose())
                    .travelClass(list.getTravelClass() != null ? list.getTravelClass().name() : null)
                    .status(list.getStatus() != null ? list.getStatus().name() : null)
                    .stay(list.getStay())
                    .travelStartDate(list.getTravelStartDate())
                    .estimatedBudget(list.getEstimatedBudget())
                    .isFlagged(list.getIsFlagged())
                    .managerApproval(list.getApprovalFlow() != null && list.getApprovalFlow().getStatus() != null
                            ? list.getApprovalFlow().getStatus().name()
                            : null)
                    .createdAt(list.getCreatedAt())
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public ManagerTravelDetailResponse getTravelRequestById(Long id) {
        TravelDetail detail = this.travelRequestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Travel request not found!"));

        if (detail.getStatus() == Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot inspect a request that is still in DRAFT!");
        }

        User employee = detail.getUser();
        ApprovalFlow flow = detail.getApprovalFlow();

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
