package se.fcvaxjo.api.service;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

/**
 * Small helpers so the login lockout can use the caller's IP without storing or logging it (issue #64, ADR 0008).
 *
 * <ul>
 * <li>{@link #hash} turns an IP into an HMAC-SHA256 with a random key made at startup. The key is never saved,
 * so after a restart nobody can turn the hashes back into IPs by trying all addresses.</li>
 * <li>{@link #truncate} cuts an IP down to /24 (IPv4) or /48 (IPv6), so a log line cannot point at one person.</li>
 * <li>{@link #isInternal} tells if an IP is a private/proxy address, which means it is not a real client IP.</li>
 * </ul>
 */
@Component
public class ClientIpPrivacy {

    /**
     * A dotted IPv4 address, or hex with a colon (IPv6). Anything else is not an IP literal, so it is never
     * passed to {@link InetAddress#getByName}, which would do a DNS lookup for a hostname.
     */
    private static final Pattern IP_LITERAL = Pattern.compile("\\d{1,3}(\\.\\d{1,3}){3}|[0-9a-fA-F.]*:[0-9a-fA-F:.]*");

    private final byte[] hmacKey = new byte[32];

    public ClientIpPrivacy() {
        new SecureRandom().nextBytes(hmacKey);
    }

    /** HMAC-SHA256 of the IP, as hex. Same IP gives the same hash until the API restarts. */
    public String hash(String ip) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(String.valueOf(ip).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            // HmacSHA256 is in every Java runtime, so this does not happen in practice.
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }

    /**
     * True if the IP is private, loopback, link-local or carrier-grade NAT (100.64/10), or cannot be read.
     * Such an address belongs to a proxy (or to this machine), not to a phone on the internet.
     */
    public static boolean isInternal(String ip) {
        InetAddress address = parse(ip);
        if (address == null) {
            return true;
        }
        byte[] b = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = b[0] & 0xff;
            int second = b[1] & 0xff;
            return first == 10
                    || first == 127
                    || (first == 172 && second >= 16 && second <= 31)
                    || (first == 192 && second == 168)
                    || (first == 169 && second == 254)
                    || (first == 100 && second >= 64 && second <= 127);
        }
        int first = b[0] & 0xff;
        int second = b[1] & 0xff;
        return address.isLoopbackAddress()                        // ::1
                || (first & 0xfe) == 0xfc                           // fc00::/7
                || (first == 0xfe && (second & 0xc0) == 0x80);      // fe80::/10
    }

    /** "203.0.113.57" becomes "203.0.113.0/24". IPv6 keeps its first 48 bits. Unreadable input becomes "unknown". */
    public static String truncate(String ip) {
        InetAddress address = parse(ip);
        if (address == null) {
            return "unknown";
        }
        byte[] b = address.getAddress();
        if (address instanceof Inet6Address) {
            return String.format("%02x%02x:%02x%02x:%02x%02x::/48", b[0], b[1], b[2], b[3], b[4], b[5]);
        }
        return (b[0] & 0xff) + "." + (b[1] & 0xff) + "." + (b[2] & 0xff) + ".0/24";
    }

    private static InetAddress parse(String ip) {
        if (ip == null || ip.isBlank() || !IP_LITERAL.matcher(ip).matches()) {
            return null;
        }
        try {
            // An IP literal is parsed directly; the pattern above makes sure no hostname reaches here.
            return InetAddress.getByName(ip);
        } catch (UnknownHostException e) {
            return null;
        }
    }
}
