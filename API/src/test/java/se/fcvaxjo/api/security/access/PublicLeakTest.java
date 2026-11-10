package se.fcvaxjo.api.security.access;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import se.fcvaxjo.api.model.AppUser;
import se.fcvaxjo.api.repository.RoleRepository;
import se.fcvaxjo.api.repository.UserRepository;
import se.fcvaxjo.api.support.Actor;
import se.fcvaxjo.api.support.ClubApiTest;

/**
 * ADR 0007: no player data is ever public.
 * Seeds one player with values that appear nowhere else, then calls every
 * GET under /api/public/** and checks that none of the values is in any body.
 * The list of endpoints comes from Spring itself, so a new public GET is
 * checked automatically without editing this test.
 */
class PublicLeakTest extends ClubApiTest {

    private static final String LEAK_NAME = "Lackagetest Unikspelare Qzx";
    private static final String LEAK_EMAIL = "lackagetest.unik.qzx@example.test";
    private static final String LEAK_PHONE = "070-9876-5432";
    private static final int LEAK_SHIRT = 7_654_321;

    private static final Pattern PATH_VARIABLE = Pattern.compile("\\{([^}/]+)}");

    @Autowired
    private ApplicationContext context;

    @Autowired
    private UserRepository users;

    @Autowired
    private RoleRepository roles;

    @Test
    void noPublicGet_leaksAnyPlayerValue() throws Exception {
        AppUser player = seedLeakPlayer();
        List<Long> ids = List.of(world.teamAlfaId(), world.matchAlfaId(), player.getId(), world.playerAlfaId());

        Set<String> patterns = publicGetPatterns();
        // Guard: if discovery breaks, the loop below would check nothing and still pass.
        assertTrue(patterns.contains("/api/public/teams"), "Found: " + patterns);
        assertTrue(patterns.contains("/api/public/matches/upcoming"), "Found: " + patterns);
        assertTrue(patterns.contains("/api/public/matches/history"), "Found: " + patterns);

        for (String pattern : patterns) {
            boolean anyOk = false;
            for (String path : concretePaths(pattern, ids)) {
                for (String url : List.of(path, path + "?teamId=" + world.teamAlfaId())) {
                    var response = get(Actor.ANON, url).andReturn().getResponse();
                    String body = response.getContentAsString();
                    assertNoLeak(url, body);
                    if (response.getStatus() == 200) {
                        anyOk = true;
                    }
                }
            }
            // A new endpoint that never answers 200 here was not really checked. Add a fitting id above.
            assertTrue(anyOk, pattern + " never answered 200, so its body was never checked");
        }
    }

    private AppUser seedLeakPlayer() {
        AppUser player = new AppUser();
        player.setName(LEAK_NAME);
        player.setEmail(LEAK_EMAIL);
        player.setMobilePhoneNumber(LEAK_PHONE);
        player.setPlayerNumber(LEAK_SHIRT);
        player.setRoleId(roles.findByName("PLAYER").orElseThrow().getId());
        player.setTeamId(world.teamAlfaId());
        player.setParentId(world.parentAlfaId());
        player.setActive(true);
        player.setPasswordHash("not-used");
        player.setMustChangePassword(false);
        return users.save(player);
    }

    private void assertNoLeak(String url, String body) {
        assertFalse(body.contains(LEAK_NAME), url + " leaked the player's name");
        assertFalse(body.contains(LEAK_EMAIL), url + " leaked the player's email");
        assertFalse(body.contains(LEAK_PHONE), url + " leaked the player's phone");
        // Whole number only, so an id or a date that happens to contain the digits does not count.
        assertFalse(Pattern.compile("(?<!\\d)" + LEAK_SHIRT + "(?!\\d)").matcher(body).find(),
                url + " leaked the player's shirt number");
    }

    /** Every GET pattern under /api/public/ that Spring has a handler for. */
    private Set<String> publicGetPatterns() {
        Set<String> found = new TreeSet<>();
        Map<String, RequestMappingHandlerMapping> mappings =
                context.getBeansOfType(RequestMappingHandlerMapping.class);
        for (RequestMappingHandlerMapping mapping : mappings.values()) {
            for (RequestMappingInfo info : mapping.getHandlerMethods().keySet()) {
                Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
                // An empty set means "any method", which includes GET.
                if (!methods.isEmpty() && !methods.contains(RequestMethod.GET)) {
                    continue;
                }
                for (String pattern : info.getPatternValues()) {
                    if (pattern.startsWith("/api/public/")) {
                        found.add(pattern);
                    }
                }
            }
        }
        return found;
    }

    /** Fills every {variable} with each real id, so the call reaches real rows. */
    private List<String> concretePaths(String pattern, List<Long> ids) {
        List<String> paths = new ArrayList<>();
        if (!PATH_VARIABLE.matcher(pattern).find()) {
            paths.add(pattern);
            return paths;
        }
        for (Long id : ids) {
            Matcher matcher = PATH_VARIABLE.matcher(pattern);
            paths.add(matcher.replaceAll(String.valueOf(id)));
        }
        return paths;
    }
}
