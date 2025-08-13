package com.example.club_management.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.club_management.models.User;
import com.example.club_management.repositories.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    public User findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
}