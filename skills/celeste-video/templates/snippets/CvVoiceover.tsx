import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import { VOICE_SEGMENTS } from "./cvVoice";

/** Add <CvVoiceover /> inside your composition. Audio files live in public/audio/voiceover/. */
export const CvVoiceover: React.FC = () => (
  <>
    {VOICE_SEGMENTS.map((seg) => (
      <Sequence key={seg.id} name={`Voix · ${seg.id}`} from={seg.fromFrame} durationInFrames={seg.frames}>
        <Audio src={staticFile(`audio/voiceover/${seg.file}`)} volume={1} />
      </Sequence>
    ))}
  </>
);
