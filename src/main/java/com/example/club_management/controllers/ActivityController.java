package com.example.club_management.controllers;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.club_management.models.Activity;
import com.example.club_management.models.Club;
import com.example.club_management.services.ActivityService;
import com.example.club_management.services.ClubService;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "http://localhost:5173")
public class ActivityController {
    @Autowired
    private ActivityService activityService;
    @Autowired
    private ClubService clubService;
    
    @GetMapping("/getactivities")
    public Page<Activity> getAllActivities(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return activityService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/club/{clubId}")
    public Page<Activity> getActivitiesByClub(@PathVariable Long clubId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "10") int size) {
        Optional<Club> club = clubService.findById(clubId);
        if (club.isPresent()) {
            return activityService.findByClub(club.get(), PageRequest.of(page, size));
        }
        return Page.empty();
    }

    @PostMapping
    public ResponseEntity<?> createActivity(@RequestBody Activity activity) {
        if (activity.getClub() == null || activity.getClub().getId() == null) {
            return ResponseEntity.badRequest().body("Activity must be associated with a club.");
        }
        Optional<Club> club = clubService.findById(activity.getClub().getId());
        if (club.isPresent()) {
            activity.setClub(club.get());
            return ResponseEntity.ok(activityService.save(activity));
        }
        return ResponseEntity.badRequest().body("Invalid club ID.");
    }
}