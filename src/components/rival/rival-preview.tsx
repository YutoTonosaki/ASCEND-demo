"use client";
import { useState } from "react";
import { RivalAvatar } from "./rival-avatar";
import { rivalColors } from "@/config/visuals";
import type { RivalColor } from "@/types/domain";
export function RivalPreview({ initialColor }: { initialColor: RivalColor }) {
  const [color, setColor] = useState(initialColor);
  return (
    <div className="rival-preview">
      <RivalAvatar color={color} />
      <fieldset>
        <legend>RIVAL COLOR PREVIEW</legend>
        <div className="color-options">
          {(Object.keys(rivalColors) as RivalColor[]).map((key) => (
            <button
              aria-label={`${key} rival`}
              aria-pressed={color === key}
              key={key}
              onClick={() => setColor(key)}
            >
              <span style={{ background: rivalColors[key] }} />
              {key}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="fine-print">Visual preview only · {color} selected</p>
    </div>
  );
}
