package com.example.club_management.controllers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.club_management.models.User;
import com.example.club_management.repositories.UserRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        // Log the username to check if the request body is being received correctly
        logger.info("Login attempt for user: {}", loginRequest.getUsername());

        // This is a placeholder for a real authentication process.
        // It simply checks if a user with the given username exists.
        User user = userRepository.findByUsername(loginRequest.getUsername());
        if (user != null) {
            logger.info("User {} found in database.", user.getUsername());
            return ResponseEntity.ok(user);
        }
        logger.warn("User with username '{}' not found.", loginRequest.getUsername());
        return ResponseEntity.badRequest().body("Invalid credentials.");
    }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User registerRequest) {
    	logger.info("Registration attempt for user: {}", registerRequest.getUsername());

    	// Check if a user with the given username already exists
    	if (userRepository.findByUsername(registerRequest.getUsername()) != null) {
    		logger.warn("Registration failed: Username '{}' is already taken.", registerRequest.getUsername());
    		return ResponseEntity.ok("Username is already taken.");
    	}

    	// In a real application, you would hash the password before saving it.
    	// For this example, we'll just save the user as is.
    	User newUser = userRepository.save(registerRequest);
    
    	logger.info("User '{}' registered successfully.", newUser.getUsername());
    	return ResponseEntity.ok(newUser);
    }
    
}