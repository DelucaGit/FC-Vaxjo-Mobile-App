package se.fcvaxjo.api.model;

import se.fcvaxjo.api.exception.BadRequestException;

/**
 * The fixed kinds of training (issue #118). A new kind needs a small code change.
 * JSON uses the enum name (FOOTBALL, FITNESS). The app shows the Swedish name.
 */
public enum TrainingType {
    FOOTBALL("Fotbollsträning"),
    FITNESS("Fysträning");

    private final String swedishName;

    TrainingType(String swedishName) {
        this.swedishName = swedishName;
    }

    public String swedishName() {
        return swedishName;
    }

    /**
     * Reads the type from a request. The request field is a plain String,
     * so an unknown value reaches us here and gets a clear Swedish 400
     * instead of a generic JSON parse error.
     */
    public static TrainingType fromRequest(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Träningstyp krävs (FOOTBALL eller FITNESS)");
        }
        for (TrainingType type : values()) {
            if (type.name().equals(value.trim())) {
                return type;
            }
        }
        throw new BadRequestException("Okänd träningstyp. Välj FOOTBALL eller FITNESS");
    }
}
