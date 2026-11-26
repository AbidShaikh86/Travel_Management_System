package com.project.backend.repository;

import com.project.backend.model.Policy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
    List<Policy> findByActiveTrue();
    boolean existsByName(String name);
}
