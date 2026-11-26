package com.project.backend.service;

import com.project.backend.DTO.Finance.FinanceReimburseUpdate;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.reimbursement.ExpenseRequest;
import com.project.backend.DTO.reimbursement.ExpenseResponse;
import com.project.backend.DTO.reimbursement.ProofResponse;
import com.project.backend.DTO.reimbursement.ReimbursementRequest;
import com.project.backend.DTO.reimbursement.ReimbursementResponse;
import com.project.backend.model.*;
import com.project.backend.model.Enumerator.AuditEntityType;
import com.project.backend.model.Enumerator.ExpenseCategory;
import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.model.Enumerator.Status;
import com.project.backend.repository.*;
import com.project.backend.util.GlobalMessage;
import com.project.backend.util.StoreFile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReimbursementService {

    private final ReimbursementRepository reimbursementRepository;
    private final UserRepository userRepository;
    private final TravelRequestRepository travelRequestRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseProofRepository expenseProofRepository;
    private final StoreFile storeFile;
    private final GlobalMessage globalMessage;
    private final AuditService auditService;

    public ReimbursementService(ReimbursementRepository reimbursementRepository,
                                UserRepository userRepository,
                                TravelRequestRepository travelRequestRepository, ExpenseRepository expenseRepository, ExpenseProofRepository expenseProofRepository, StoreFile storeFile, GlobalMessage globalMessage,
                                AuditService auditService){
        this.reimbursementRepository = reimbursementRepository;
        this.userRepository = userRepository;
        this.travelRequestRepository = travelRequestRepository;
        this.expenseRepository = expenseRepository;
        this.expenseProofRepository = expenseProofRepository;
        this.storeFile = storeFile;
        this.globalMessage = globalMessage;
        this.auditService = auditService;
    }

    @Transactional
    public ResponseEntity<GlobalResponse> createReimbursement(ReimbursementRequest reimbursementRequest) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = this.userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Unauthorized!"));

        TravelDetail detail = this.travelRequestRepository.findById(reimbursementRequest.getTravelId())
                .orElseThrow(() -> new RuntimeException("Travel Details not found"));

        if (!detail.getUser().getId().equals(user.getId())) {
            return this.globalMessage.GlobalMessageHandler(false, "You cannot claim reimbursement for another employee's travel!", HttpStatus.FORBIDDEN);
        }

        if (detail.getStatus() != Status.APPROVED && detail.getStatus() != Status.COMPLETED) {
            return this.globalMessage.GlobalMessageHandler(false, "Reimbursement can only be created for APPROVED or COMPLETED travel!",
                HttpStatus.BAD_REQUEST);
        }

        if (this.reimbursementRepository.existsByTravelDetailId(detail.getId())) {
            return this.globalMessage.GlobalMessageHandler(false, "A reimbursement claim already exists for this travel!", HttpStatus.CONFLICT);
        }

        Reimbursement reim = Reimbursement.builder()
                .user(user)
                .travelDetail(detail)
                .comment(reimbursementRequest.getComment())
                .status(ReimbursementStatus.DRAFT)
                .build();

        this.reimbursementRepository.save(reim);
        this.auditService.log(
                AuditEntityType.REIMBURSEMENT,
                reim.getId(),
                "CREATE_REIMBURSEMENT",
                "Created reimbursement for travelId=" + detail.getId()
                        + ", employeeEmail=" + user.getEmail()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Reimbursement Request has been created successfully!", HttpStatus.CREATED);
    }

    @Transactional
    public ResponseEntity<GlobalResponse> addExpenseToReimbursement(Long id, ExpenseRequest expenseRequest) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Reimbursement reimbursement = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Id is Invalid!"));

        if (!reimbursement.getUser().getEmail().equals(email)) {
            return this.globalMessage.GlobalMessageHandler(false, "You are not authorized to modify this reimbursement!", HttpStatus.FORBIDDEN);
        }

        if (reimbursement.getStatus() != ReimbursementStatus.DRAFT) {
            return this.globalMessage.GlobalMessageHandler(false, "Cannot add expenses to a reimbursement that has already been submitted or processed!", HttpStatus.BAD_REQUEST);
        }

        User user = reimbursement.getUser();

        if (reimbursement.getExpenses() == null) {
            reimbursement.setExpenses(new ArrayList<>());
        }

        ProofResponse proofResponse;
        try {
            proofResponse = this.storeFile.save(expenseRequest.getFile(), id);
        } catch (IOException e) {
            return this.globalMessage.GlobalMessageHandler(false, "Failed to store receipt file: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }

        Expense expense = Expense.builder()
                .category(ExpenseCategory.valueOf(expenseRequest.getCategory()))
                .amount(expenseRequest.getAmount())
                .reimbursement(reimbursement)
                .build();

        ExpenseProof proof = ExpenseProof.builder()
                .contentType(proofResponse.getContentType())
                .filePath(proofResponse.getUrl())
                .fileSize(proofResponse.getFileSize())
                .originalFileName(proofResponse.getFileName())
                .reimbursement(reimbursement)
                .uploadedAt(OffsetDateTime.now())
                .uploadedBy(user)
                .storedFileName(proofResponse.getStoredFileName())
                .build();

        ExpenseProof savedProof = this.expenseProofRepository.save(proof);

        expense.setExpenseProof(savedProof);

        Expense newExpense = this.expenseRepository.save(expense);

        reimbursement.getExpenses().add(newExpense);
        this.reimbursementRepository.save(reimbursement);
        this.auditService.log(
                AuditEntityType.EXPENSE,
                newExpense.getId(),
                "ADD_EXPENSE",
                "Added expense to reimbursementId=" + id
                        + ", category=" + expenseRequest.getCategory()
                        + ", amount=" + expenseRequest.getAmount()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Expense has been added successfully!", HttpStatus.CREATED);
    }

    @Transactional
    public ResponseEntity<GlobalResponse> reimbursementSubmit(Long id){
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Reimbursement reim = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invalid Request"));

        if (!reim.getUser().getEmail().equals(email)) {
            return this.globalMessage.GlobalMessageHandler(false, "You are not authorized to submit this reimbursement!", HttpStatus.FORBIDDEN);
        }

        if (reim.getStatus() != ReimbursementStatus.DRAFT) {
            return this.globalMessage.GlobalMessageHandler(false, "Only DRAFT reimbursements can be submitted!", HttpStatus.BAD_REQUEST);
        }

        if (reim.getExpenses() == null || reim.getExpenses().isEmpty()) {
            return this.globalMessage.GlobalMessageHandler(false, "Cannot submit a reimbursement claim with no expenses attached!", HttpStatus.BAD_REQUEST);
        }

        reim.setStatus(ReimbursementStatus.PENDING);
        this.reimbursementRepository.save(reim);
        this.auditService.log(
                AuditEntityType.REIMBURSEMENT,
                reim.getId(),
                "SUBMIT_REIMBURSEMENT",
                "Submitted reimbursement id=" + reim.getId()
        );
        return this.globalMessage.GlobalMessageHandler(true, "Reimbursement submitted successfully!", HttpStatus.ACCEPTED);
    }

    @Transactional
    public ResponseEntity<GlobalResponse> reimbursementStatusUpdateByFinanace(Long id, FinanceReimburseUpdate financeReimburseUpdate) {
        Reimbursement reim = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invalid id!"));
        if (reim.getStatus() != ReimbursementStatus.PENDING) {
            return this.globalMessage.GlobalMessageHandler(false, "Reimbursement must be in PENDING status for Finance review!", HttpStatus.BAD_REQUEST);
        }

        ReimbursementStatus targetStatus = ReimbursementStatus.valueOf(financeReimburseUpdate.getStatus());
        if (targetStatus != ReimbursementStatus.APPROVED && targetStatus != ReimbursementStatus.REJECTED) {
            return this.globalMessage.GlobalMessageHandler(false, "Finance can only mark status as APPROVED or REJECTED!", HttpStatus.BAD_REQUEST);
        }

        reim.setStatus(targetStatus);
        reim.setProcessedAt(LocalDateTime.now());
        this.reimbursementRepository.save(reim);
        this.auditService.log(
                AuditEntityType.REIMBURSEMENT,
                reim.getId(),
                "FINANCE_REIMBURSEMENT_UPDATE",
                "Finance updated reimbursement id=" + reim.getId()
                        + ", status=" + targetStatus
        );
        return this.globalMessage.GlobalMessageHandler(true, "You have updated status successfully!", HttpStatus.ACCEPTED);
    }

    @Transactional
    public ResponseEntity<GlobalResponse> reimbursementPaid(Long id) {
        Reimbursement reim = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invalid id!"));

        if (reim.getStatus() != ReimbursementStatus.APPROVED) {
            return this.globalMessage.GlobalMessageHandler(false, "Only APPROVED reimbursement claims can be marked as PAID! Current status: " + reim.getStatus(), HttpStatus.CONFLICT );
        }

        reim.setStatus(ReimbursementStatus.PAID);
        this.reimbursementRepository.save(reim);
        this.auditService.log(
                AuditEntityType.REIMBURSEMENT,
                reim.getId(),
                "REIMBURSEMENT_PAID",
                "Reimbursement marked as PAID id=" + reim.getId()
        );
        return this.globalMessage.GlobalMessageHandler(true, "You have updated status successfully!", HttpStatus.ACCEPTED);
    }

    @Transactional(readOnly = true)
    public List<ReimbursementResponse> getMyReimbursements() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = this.userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Unauthorized!"));
        return this.reimbursementRepository.findByUserId(user.getId())
                .stream()
                .map(this::toReimbursementResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResponseEntity<?> getReimbursementById(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Reimbursement reim = this.reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reimbursement not found!"));
        if (reim.getUser() == null || !reim.getUser().getEmail().equals(email)) {
            return this.globalMessage.GlobalMessageHandler(false, "Unauthorized access to reimbursement details!", HttpStatus.FORBIDDEN);
        }

        return ResponseEntity.ok(toReimbursementResponse(reim));
    }

    private ReimbursementResponse toReimbursementResponse(Reimbursement reim) {
        List<ExpenseResponse> expenseResponses = reim.getExpenses() != null
                ? reim.getExpenses().stream().map(exp -> {
                    ExpenseProof proof = exp.getExpenseProof();
                    return ExpenseResponse.builder()
                            .id(exp.getId())
                            .category(exp.getCategory() != null ? exp.getCategory().name() : null)
                            .amount(exp.getAmount())
                            .proofFileName(proof != null ? proof.getOriginalFileName() : null)
                            .proofUrl(proof != null ? proof.getFilePath() : null)
                            .createdAt(exp.getCreatedAt())
                            .build();
                }).toList()
                : List.of();

        double totalAmount = expenseResponses.stream()
                .mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0)
                .sum();

        User owner = reim.getUser();
        TravelDetail travel = reim.getTravelDetail();

        return ReimbursementResponse.builder()
                .id(reim.getId())
                .employeeName(owner != null ? owner.getName() : null)
                .employeeEmail(owner != null ? owner.getEmail() : null)
                .travelDetailId(travel != null ? travel.getId() : null)
                .travelDestination(travel != null ? travel.getDestination() : null)
                .travelStartDate(travel != null ? travel.getTravelStartDate() : null)
                .status(reim.getStatus() != null ? reim.getStatus().name() : null)
                .comment(reim.getComment())
                .totalAmount(totalAmount)
                .createdAt(reim.getCreatedAt())
                .processedAt(reim.getProcessedAt())
                .expenses(expenseResponses)
                .build();
    }
}
