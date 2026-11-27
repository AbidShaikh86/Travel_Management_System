package com.project.backend.service;

import com.project.backend.DTO.Admin.DepartmentDDResponse;
import com.project.backend.model.Department;
import com.project.backend.model.Enumerator.ReimbursementStatus;
import com.project.backend.repository.DepartmentRepository;
import com.project.backend.repository.ExpenseRepository;
import com.project.backend.repository.PolicyRepository;
import com.project.backend.repository.UserAuthRepository;
import com.project.backend.repository.UserRepository;
import com.project.backend.util.GlobalMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PolicyRepository policyRepository;
    @Mock
    private UserAuthRepository userAuthRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private GlobalMessage globalMessage;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void getAllDepartment_includesPaidReimbursementSpendAndTotals() {
        Department eng = Department.builder()
                .deptId(10L)
                .departmentName("Engineering")
                .annualTravelBudget(750000.0)
                .build();
        Department hr = Department.builder()
                .deptId(20L)
                .departmentName("Human Resources")
                .annualTravelBudget(200000.0)
                .build();
        Department ops = Department.builder()
                .deptId(30L)
                .departmentName("Operations")
                .annualTravelBudget(null)
                .build();

        when(departmentRepository.findAll()).thenReturn(List.of(eng, hr, ops));
        when(expenseRepository.sumAmountByDepartmentIdAndReimbursementStatus(ReimbursementStatus.PAID))
                .thenReturn(List.<Object[]>of(new Object[]{10L, 45000.0}));

        List<DepartmentDDResponse> result = adminService.getAllDepartment();

        assertThat(result).hasSize(3);
        assertThat(result.get(0).getId()).isEqualTo(10L);
        assertThat(result.get(0).getSpent()).isEqualTo(45000.0);
        assertThat(result.get(0).getTotalAllocatedBudget()).isEqualTo(950000.0);

        assertThat(result.get(1).getId()).isEqualTo(20L);
        assertThat(result.get(1).getSpent()).isEqualTo(0.0);
        assertThat(result.get(1).getTotalAllocatedBudget()).isEqualTo(950000.0);

        assertThat(result.get(2).getId()).isEqualTo(30L);
        assertThat(result.get(2).getAnnualTravelBudget()).isNull();
        assertThat(result.get(2).getSpent()).isEqualTo(0.0);

        verify(expenseRepository).sumAmountByDepartmentIdAndReimbursementStatus(ReimbursementStatus.PAID);
    }
}
