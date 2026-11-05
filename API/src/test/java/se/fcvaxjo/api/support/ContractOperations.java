package se.fcvaxjo.api.support;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Every operation in the API contract.
 * The anonymous test walks this list so a new path in openapi.yaml is not forgotten.
 */
public final class ContractOperations {

    public record Operation(String method, String path) {
    }

    private ContractOperations() {
    }

    public static List<Operation> read() throws IOException {
        List<String> lines = Files.readAllLines(contractFile());
        List<Operation> operations = new ArrayList<>();
        String path = null;

        for (String raw : lines) {
            if (raw.startsWith("  /api/") && raw.endsWith(":")) {
                path = raw.substring(2, raw.length() - 1);
                continue;
            }
            if (path == null || !raw.startsWith("    ") || raw.startsWith("     ")) {
                continue;
            }
            String method = httpMethod(raw);
            if (method != null) {
                operations.add(new Operation(method, path));
            }
        }

        if (operations.isEmpty()) {
            throw new IllegalStateException("No operations found in " + contractFile());
        }
        return operations;
    }

    public static boolean isLogin(Operation operation) {
        return "POST".equals(operation.method()) && "/api/auth/login".equals(operation.path());
    }

    private static String httpMethod(String line) {
        String trimmed = line.trim();
        if (trimmed.equals("get:")) {
            return "GET";
        }
        if (trimmed.equals("post:")) {
            return "POST";
        }
        if (trimmed.equals("put:")) {
            return "PUT";
        }
        if (trimmed.equals("delete:")) {
            return "DELETE";
        }
        return null;
    }

    private static Path contractFile() {
        Path fromApiModule = Path.of("..", "docs", "api", "openapi.yaml");
        if (Files.exists(fromApiModule)) {
            return fromApiModule;
        }
        Path fromRepoRoot = Path.of("docs", "api", "openapi.yaml");
        if (Files.exists(fromRepoRoot)) {
            return fromRepoRoot;
        }
        throw new IllegalStateException("Cannot find docs/api/openapi.yaml");
    }
}
