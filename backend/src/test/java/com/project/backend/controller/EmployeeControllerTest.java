package com.project.backend.controller;

import com.project.backend.DTO.Employee.TravelRequest;
import com.project.backend.DTO.GlobalResponse;
import com.project.backend.exception.GlobalExceptionHandler;
import com.project.backend.service.EmployeeService;
import com.project.backend.service.ReimbursementService;
import com.project.backend.util.GlobalMessage;
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

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class EmployeeControllerTest {

    @Mock
    private EmployeeService employeeService;

    @InjectMocks
    private EmployeeController employeeController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(employeeController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void requestTravel_validRequest_returnsCreated() throws Exception {
        String jsonBody = buildTravelRequestJson("Delhi", LocalDate.now().plusDays(1), 2, 10000.0, "PENDING");
        GlobalResponse response = new GlobalResponse(true, "Travel request has been added successfully!");

        when(employeeService.travelRequest(any(TravelRequest.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.CREATED).body(response));

        mockMvc.perform(post("/api/employee/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.process").value(true))
                .andExpect(jsonPath("$.message").value("Travel request has been added successfully!"));

        ArgumentCaptor<TravelRequest> captor = ArgumentCaptor.forClass(TravelRequest.class);
        verify(employeeService).travelRequest(captor.capture());
        assertThat(captor.getValue().getDestination()).isEqualTo("Delhi");
        assertThat(captor.getValue().getStatus()).isEqualTo("PENDING");
    }

    @Test
    void requestTravel_invalidPayload_returnsBadRequestWithoutCallingService() throws Exception {
        String invalidJson = buildTravelRequestJson("", LocalDate.now().minusDays(1), 0, -500.0, "INVALID");

        mockMvc.perform(post("/api/employee/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("Destination is required")))
                .andExpect(jsonPath("$.message", containsString("Travel start date must be today or in the future")));

        verify(employeeService, never()).travelRequest(any(TravelRequest.class));
    }

    @Test
    void updateDraftedTravelRequest_validRequest_returnsAccepted() throws Exception {
        String jsonBody = buildTravelRequestJson("Pune", LocalDate.now().plusDays(4), 3, 12000.0, "PENDING");
        GlobalResponse response = new GlobalResponse(true, "Travel request has been submitted for approval!");

        when(employeeService.updateDraftedTravelRequest(eq(10L), any(TravelRequest.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.ACCEPTED).body(response));

        mockMvc.perform(patch("/api/employee/request/{id}/update", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.process").value(true))
                .andExpect(jsonPath("$.message").value("Travel request has been submitted for approval!"));

        ArgumentCaptor<TravelRequest> captor = ArgumentCaptor.forClass(TravelRequest.class);
        verify(employeeService).updateDraftedTravelRequest(eq(10L), captor.capture());
        assertThat(captor.getValue().getDestination()).isEqualTo("Pune");
        assertThat(captor.getValue().getStatus()).isEqualTo("PENDING");
    }

    @Test
    void updateDraftedTravelRequest_alreadySubmitted_returnsConflict() throws Exception {
        String jsonBody = buildTravelRequestJson("Pune", LocalDate.now().plusDays(4), 3, 12000.0, "DRAFT");
        GlobalResponse conflictResponse = new GlobalResponse(false, "Travel request is already submitted!");

        when(employeeService.updateDraftedTravelRequest(eq(10L), any(TravelRequest.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.CONFLICT).body(conflictResponse));

        mockMvc.perform(patch("/api/employee/request/{id}/update", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.process").value(false))
                .andExpect(jsonPath("$.message").value("Travel request is already submitted!"));

        verify(employeeService).updateDraftedTravelRequest(eq(10L), any(TravelRequest.class));
    }

    private String buildTravelRequestJson(String destination,
                                          LocalDate travelStartDate,
                                          int stay,
                                          double estimatedBudget,
                                          String status) {
        return """
                {
                  "userId": 1,
                  "destination": "%s",
                  "travelClass": "FLIGHT_ECONOMY",
                  "travelStartDate": "%s",
                  "purpose": "Client meeting",
                  "stay": %d,
                  "estimatedBudget": %s,
                  "status": "%s"
                }
                """.formatted(destination, travelStartDate, stay, estimatedBudget, status);
    }
}
