package com.project.backend.controller;

import com.project.backend.DTO.GlobalResponse;
import com.project.backend.DTO.Manager.ApprovalFlowUpdateRequest;
import com.project.backend.exception.GlobalExceptionHandler;
import com.project.backend.service.ManagerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class ManagerControllerTest {

    @Mock
    private ManagerService managerService;

    @InjectMocks
    private ManagerController managerController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(managerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void managerTravelStatusUpdate_validRequest_returnsAccepted() throws Exception {
        String jsonBody = buildUpdateRequestJson("APPROVED", "Approved for client visit");
        GlobalResponse response = new GlobalResponse(true, "Status has been updated!");

        when(managerService.updateTravelRequestStatus(eq(1L), any(ApprovalFlowUpdateRequest.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.ACCEPTED).body(response));

        mockMvc.perform(patch("/api/manager/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.process").value(true))
                .andExpect(jsonPath("$.message").value("Status has been updated!"));

        ArgumentCaptor<ApprovalFlowUpdateRequest> captor = ArgumentCaptor.forClass(ApprovalFlowUpdateRequest.class);
        verify(managerService).updateTravelRequestStatus(eq(1L), captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("APPROVED");
        assertThat(captor.getValue().getComment()).isEqualTo("Approved for client visit");
    }

    @Test
    void managerTravelStatusUpdate_invalidStatus_returnsBadRequestWithoutCallingService() throws Exception {
        String invalidJson = buildUpdateRequestJson("INVALID_STATUS", "Invalid status update");

        mockMvc.perform(patch("/api/manager/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("Status must be a valid status")));

        verify(managerService, never()).updateTravelRequestStatus(any(), any(ApprovalFlowUpdateRequest.class));
    }

    private String buildUpdateRequestJson(String status, String comment) {
        return """
                {
                  "status": "%s",
                  "comment": "%s"
                }
                """.formatted(status, comment);
    }
}
