import { Text, View } from "react-native";
import { Choice, s } from "@/components/ui/primitives";
import { Counter } from "@/components/training/controls";
import { bodyParts, equipmentOptions } from "@/config/training";
import { coachConfig, locationLabels } from "@/config/coach";
import type { CoachPreferences } from "@/types/coach";
export function CoachPreferencesForm({
  value,
  onChange,
  focus = false,
}: {
  value: CoachPreferences;
  onChange: (value: CoachPreferences) => void;
  focus?: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      {focus && (
        <>
          <Text style={s.eyebrow}>TARGET BODY PARTS · EMPTY = AUTOMATIC</Text>
          <View style={s.choices}>
            {bodyParts.map((part) => (
              <Choice
                key={part}
                label={part}
                selected={value.bodyParts.includes(part)}
                onPress={() =>
                  onChange({
                    ...value,
                    bodyParts: value.bodyParts.includes(part)
                      ? value.bodyParts.filter((x) => x !== part)
                      : [...value.bodyParts, part],
                  })
                }
              />
            ))}
          </View>
        </>
      )}
      <Text style={s.eyebrow}>TRAINING LOCATION</Text>
      <View style={s.choices}>
        {(Object.keys(locationLabels) as (keyof typeof locationLabels)[]).map(
          (location) => (
            <Choice
              key={location}
              label={locationLabels[location]}
              selected={value.location === location}
              onPress={() => onChange({ ...value, location })}
            />
          ),
        )}
      </View>
      <Text style={s.eyebrow}>AVAILABLE EQUIPMENT</Text>
      <Text style={s.fine}>
        Select only what you can use at this location. Bodyweight is always
        available.
      </Text>
      <View style={s.choices}>
        {equipmentOptions
          .filter((item) => item !== "Bodyweight")
          .map((item) => (
            <Choice
              key={item}
              label={item}
              selected={value.equipment.includes(item)}
              onPress={() =>
                onChange({
                  ...value,
                  equipment: value.equipment.includes(item)
                    ? value.equipment.filter((x) => x !== item)
                    : [...value.equipment, item],
                })
              }
            />
          ))}
      </View>
      <Counter
        label="Available minutes"
        displayLabel="Minutes"
        value={value.durationMinutes}
        max={coachConfig.maxMinutes}
        onChange={(durationMinutes) => onChange({ ...value, durationMinutes })}
      />
      <Counter
        label="Preferred exercise count"
        displayLabel="Exercises"
        value={value.exerciseCount}
        max={coachConfig.maxCount}
        onChange={(exerciseCount) => onChange({ ...value, exerciseCount })}
      />
      <Text style={s.fine}>
        Exercise count is a maximum; a shorter plan may fit your time better.
      </Text>
    </View>
  );
}
