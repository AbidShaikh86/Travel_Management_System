package com.project.backend.repository;

import com.project.backend.model.Enumerator.Role;
import com.project.backend.model.User;
import com.project.backend.model.UserAuth;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAuthRepository extends JpaRepository<UserAuth,Long> {
    @Override
    @EntityGraph(attributePaths = "user")
    List<UserAuth> findAll();

    @EntityGraph(attributePaths = "user")
    Optional<UserAuth> findByUser_Email(String email);

    Optional<UserAuth> findByUser(User user);

    @EntityGraph(attributePaths = "user")
    List<UserAuth> findByRole(Role role);
}
