import { useLocalization } from "@/localization";
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
  const l = useLocalization();
  const { tr } = useLocalization();
  return (
    <View style={{ gap: 12 }}>
      {focus && (
        <>
          <Text style={s.eyebrow}>{tr("coach.focus")}</Text>
          <View style={s.choices}>
            {bodyParts.map((part) => (
              <Choice
                key={part}
                label={l.display(part)}
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
      <Text style={s.eyebrow}>{tr("coach.location")}</Text>
      <View style={s.choices}>
        {(Object.keys(locationLabels) as (keyof typeof locationLabels)[]).map(
          (location) => (
            <Choice
              key={location}
              label={l.display(locationLabels[location])}
              selected={value.location === location}
              onPress={() => onChange({ ...value, location })}
            />
          ),
        )}
      </View>
      <Text style={s.eyebrow}>{tr("coach.equipment")}</Text>
      <Text style={s.fine}>{tr("coach.equipmentNote")}</Text>
      <View style={s.choices}>
        {equipmentOptions
          .filter((item) => item !== "Bodyweight")
          .map((item) => (
            <Choice
              key={item}
              label={l.display(item)}
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
        label={tr("coach.minutes")}
        displayLabel={tr("units.minutes")}
        value={value.durationMinutes}
        max={coachConfig.maxMinutes}
        onChange={(durationMinutes) => onChange({ ...value, durationMinutes })}
      />
      <Counter
        label={tr("coach.exerciseCount")}
        displayLabel={tr("units.exercises")}
        value={value.exerciseCount}
        max={coachConfig.maxCount}
        onChange={(exerciseCount) => onChange({ ...value, exerciseCount })}
      />
      <Text style={s.fine}>{tr("coach.countNote")}</Text>
    </View>
  );
}
