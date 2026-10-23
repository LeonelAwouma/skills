import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import { VOICE_SEGMENTS } from "../engine/voice";

/** One <Audio> per narration segment, placed at the start measured by generate-voiceover.py. */
export const Voiceover: React.FC = () => (
  <>
    {VOICE_SEGMENTS.map((seg) => (
      <Sequence key={seg.id} name={`Voix · ${seg.id}`} from={seg.fromFrame} durationInFrames={seg.frames}>
        <Audio src={staticFile(`audio/voiceover/${seg.file}`)} volume={1} />
      </Sequence>
    ))}
  </>
);
