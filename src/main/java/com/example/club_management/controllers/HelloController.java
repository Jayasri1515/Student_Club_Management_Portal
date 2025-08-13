package com.example.club_management.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/")
    public String home() {
        return "Hello World! The server is running.";
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello from the test endpoint!";
    }
}
