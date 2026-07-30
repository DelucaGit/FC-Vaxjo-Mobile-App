package se.fcvaxjo.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * End-to-end style test: create users/team/player through the REST API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClubApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createTeamPlayerAndLinkParent() throws Exception {
        long parentId = createUser("Anna", "Parent", "anna.parent@example.com", "PARENT");
        long coachId = createUser("Erik", "Coach", "erik.coach@example.com", "COACH");

        MvcResult teamResult = mockMvc.perform(post("/api/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "P12 Blå",
                                  "ageGroup": "2014",
                                  "season": "2026"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("P12 Blå"))
                .andReturn();

        long teamId = objectMapper.readTree(teamResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/teams/" + teamId + "/coaches/" + coachId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coaches[0].email").value("erik.coach@example.com"));

        MvcResult playerResult = mockMvc.perform(post("/api/players")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Leo",
                                  "lastName": "Andersson",
                                  "dateOfBirth": "2014-05-20",
                                  "jerseyNumber": 7,
                                  "teamId": %d,
                                  "parentIds": [%d]
                                }
                                """.formatted(teamId, parentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("Leo"))
                .andExpect(jsonPath("$.teamName").value("P12 Blå"))
                .andExpect(jsonPath("$.parents[0].email").value("anna.parent@example.com"))
                .andReturn();

        long playerId = objectMapper.readTree(playerResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/players").param("teamId", String.valueOf(teamId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(playerId));

        // Assign same team again via PUT — still works.
        mockMvc.perform(put("/api/players/" + playerId + "/team/" + teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamId").value(teamId));
    }

    private long createUser(String firstName, String lastName, String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "%s",
                                  "lastName": "%s",
                                  "email": "%s",
                                  "password": "secret",
                                  "role": "%s"
                                }
                                """.formatted(firstName, lastName, email, role)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }
}
