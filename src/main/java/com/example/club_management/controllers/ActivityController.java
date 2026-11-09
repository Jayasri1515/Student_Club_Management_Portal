package com.example.club_management.controllers;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.club_management.models.Activity;
import com.example.club_management.models.Club;
import com.example.club_management.services.ActivityService;
import com.example.club_management.services.ClubService;
import com.fasterxml.jackson.databind.JsonNode;

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

    /** title and description are plain JPA String columns (VARCHAR(255)). */
    private static final int TEXT_MAX_LENGTH = 255;

    /**
     * Update an activity's title, description and date. The owning club cannot be changed.
     * The title is required. For description and date, a field that is left out of the body is
     * kept as it is, while an explicit {@code null} clears it.
     * 200 with the updated activity; 400 if the body is invalid (missing or blank title, text over
     * 255 characters, or a date that is not YYYY-MM-DD); 404 if the activity does not exist.
     * NOTE: the backend has no authentication, so no role check is enforced here.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateActivity(@PathVariable Long id, @RequestBody JsonNode body) {
        Optional<Activity> optionalActivity = activityService.findById(id);
        if (optionalActivity.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Activity not found.");
        }
        if (body == null || !body.isObject()) {
            return ResponseEntity.badRequest().body("Request body must be a JSON object.");
        }

        JsonNode title = body.get("title");
        if (title == null || !title.isTextual() || title.asText().isBlank()) {
            return ResponseEntity.badRequest().body("Activity title is required.");
        }
        if (title.asText().length() > TEXT_MAX_LENGTH) {
            return ResponseEntity.badRequest()
                    .body("Activity title must be " + TEXT_MAX_LENGTH + " characters or fewer.");
        }

        boolean setDescription = body.has("description");
        String description = null;
        if (setDescription && !body.get("description").isNull()) {
            JsonNode node = body.get("description");
            if (!node.isTextual()) {
                return ResponseEntity.badRequest().body("Description must be text.");
            }
            description = node.asText();
            if (description.length() > TEXT_MAX_LENGTH) {
                return ResponseEntity.badRequest()
                        .body("Description must be " + TEXT_MAX_LENGTH + " characters or fewer.");
            }
        }

        boolean setDate = body.has("date");
        LocalDate date = null;
        if (setDate && !body.get("date").isNull()) {
            JsonNode node = body.get("date");
            try {
                if (!node.isTextual()) {
                    throw new DateTimeParseException("not text", String.valueOf(node), 0);
                }
                date = LocalDate.parse(node.asText());
            } catch (DateTimeParseException invalidDate) {
                return ResponseEntity.badRequest().body("Date must be a valid date (YYYY-MM-DD).");
            }
        }

        Activity activity = optionalActivity.get();
        activity.setTitle(title.asText());
        if (setDescription) {
            activity.setDescription(description);
        }
        if (setDate) {
            activity.setDate(date);
        }
        return ResponseEntity.ok(activityService.save(activity));
    }

    /**
     * Delete an activity. 204 on success; 404 if the activity does not exist.
     * NOTE: the backend has no authentication, so no role check is enforced here.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteActivity(@PathVariable Long id) {
        if (activityService.findById(id).isPresent()) {
            activityService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Activity not found.");
    }
}