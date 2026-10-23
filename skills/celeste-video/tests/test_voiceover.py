"""Unit tests for the pure helpers of scripts/voice/generate-voiceover.py (no model needed).

Run with any Python 3.10+ (numpy is required by the module):
    python -m unittest discover -s tests -p "test_*.py"
"""
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "voice" / "generate-voiceover.py"
spec = importlib.util.spec_from_file_location("gv", SCRIPT)
gv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gv)


class PhraseSplit(unittest.TestCase):
    def test_lines_never_exceed_limit_plus_one_word(self):
        text = "Chez Céleste Corp, nous développons des logiciels et des plateformes adaptés à vos besoins."
        for p in gv.phrase_split(text, 27):
            self.assertLessEqual(len(p), 27 + 8, p)

    def test_text_is_preserved(self):
        text = "Nous automatisons vos processus grâce à l'intelligence artificielle"
        joined = " ".join(gv.phrase_split(text, 27)).replace(" ", " ")
        self.assertEqual(joined, text)

    def test_french_punctuation_stays_glued(self):
        phrases = gv.phrase_split("Votre entreprise perd du temps ?", 27)
        self.assertTrue(phrases[-1].endswith(" ?"))

    def test_breaks_after_comma(self):
        self.assertEqual(gv.phrase_split("Chez Céleste Corp, nous développons", 40)[0], "Chez Céleste Corp,")


class Cues(unittest.TestCase):
    def test_cues_cover_the_measured_sentence_without_gaps(self):
        sentences = [{"start": 0.0, "end": 1.2}, {"start": 1.6, "end": 2.8}]
        cues = gv.build_cues("Moins de complexité. Plus de possibilités.", 26.35, 2.8, sentences, 27)
        self.assertEqual(len(cues), 2)
        self.assertAlmostEqual(cues[0]["start"], 26.35, places=3)
        self.assertAlmostEqual(cues[1]["end"], 26.35 + 2.8, places=2)
        self.assertLess(cues[0]["end"], cues[1]["start"])  # real pause between the sentences is kept

    def test_proportional_split_inside_one_sentence(self):
        cues = gv.build_cues("Chez Céleste Corp, nous développons des logiciels et des plateformes adaptés à vos besoins.", 7.5, 4.8, [{"start": 0.0, "end": 4.8}], 27)
        self.assertGreater(len(cues), 2)
        for a, b in zip(cues, cues[1:]):
            self.assertAlmostEqual(a["end"], b["start"], places=2)
        self.assertAlmostEqual(cues[-1]["end"], 12.3, places=2)

    def test_falls_back_when_sentence_count_differs(self):
        cues = gv.build_cues("Une phrase. Deux phrases.", 0, 3.0, [{"start": 0, "end": 3.0}], 27)
        self.assertAlmostEqual(cues[-1]["end"], 3.0, places=2)


class Srt(unittest.TestCase):
    def test_time_format(self):
        self.assertEqual(gv.srt_time(0), "00:00:00,000")
        self.assertEqual(gv.srt_time(3723.456), "01:02:03,456")


class Audio(unittest.TestCase):
    def test_finish_matches_level_trims_and_never_exceeds_ceiling(self):
        import numpy as np

        sr = 22050
        t = np.arange(sr) / sr
        tone = (0.9 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
        x = np.concatenate([np.zeros(sr // 2, np.float32), tone, np.zeros(sr // 2, np.float32)])
        y, head = gv.finish(x, sr, -19.0)
        self.assertLess(len(y), len(x))  # silence trimmed
        self.assertGreater(head, 0)
        self.assertLessEqual(float(np.max(np.abs(y))), gv.PEAK_CEILING + 1e-6)
        rms_db = 20 * np.log10(gv.speech_rms(y, sr))
        self.assertAlmostEqual(rms_db, -19.0, delta=2.0)


if __name__ == "__main__":
    unittest.main()
