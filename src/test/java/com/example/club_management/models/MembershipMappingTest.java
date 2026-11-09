package com.example.club_management.models;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** The database, not the check-then-save in the service, is what stops duplicate memberships. */
class MembershipMappingTest {

    @Test
    void oneMembershipRowPerUserAndClub() {
        Table table = Membership.class.getAnnotation(Table.class);
        UniqueConstraint[] constraints = table.uniqueConstraints();

        assertEquals(1, constraints.length);
        assertArrayEquals(new String[] { "user_id", "club_id" }, constraints[0].columnNames());
    }
}
