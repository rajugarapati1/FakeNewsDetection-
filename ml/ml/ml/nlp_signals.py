import re

class NLPSignalExtractor:
    def extract(self, text: str) -> dict:
        words = text.split()
        sentences = re.split(r'[.!?]+', text)

        # Emotional language — exclamation marks, caps words
        exclamations = text.count("!")
        caps_words = sum(1 for w in words if w.isupper() and len(w) > 2)
        emotional = min(100, (exclamations * 10) + (caps_words * 5))

        # Clickbait — question marks, sensational words
        clickbait_words = ["shocking", "unbelievable", "breaking", "urgent",
                          "exposed", "secret", "they don't want you to know"]
        clickbait = min(100, text.lower().count("?") * 10 +
                       sum(10 for w in clickbait_words if w in text.lower()))

        # Source credibility — presence of quotes, references
        has_quotes = 1 if '"' in text or "'" in text else 0
        credibility = min(100, has_quotes * 30 + min(70, len(words) // 5))

        # Factual consistency — numbers, dates as proxy
        numbers = len(re.findall(r'\b\d+\b', text))
        factual = min(100, numbers * 10)

        # Logical coherence — avg sentence length proxy
        avg_len = len(words) / max(len(sentences), 1)
        coherence = min(100, int(avg_len * 3))

        # Bias indicators — one-sided language
        bias_words = ["always", "never", "all", "none", "every", "only",
                     "impossible", "definitely", "absolutely"]
        bias = min(100, sum(10 for w in bias_words if w in text.lower()))

        return {
            "emotional_language": emotional,
            "source_credibility": credibility,
            "factual_consistency": factual,
            "clickbait_score": clickbait,
            "logical_coherence": coherence,
            "bias_indicators": bias
        }
