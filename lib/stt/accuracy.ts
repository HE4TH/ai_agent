// 단어 단위 편집 거리(Levenshtein distance). 문자가 아니라 단어를 하나의 단위로 취급한다.
function wordLevenshteinDistance(a: string[], b: string[]): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[rows - 1][cols - 1];
}

// 정답 텍스트 대비 인식 결과의 단어 단위 정확도(%).
// 정답/인식 결과를 공백 기준으로 나눈 단어 배열의 Levenshtein distance를 구해
// (1 - 편집거리 / max(단어수1, 단어수2)) * 100으로 계산한다. 정답이 없으면 null.
export function calculateWordAccuracy(
  hypothesis: string | null | undefined,
  reference: string | null | undefined
): number | null {
  if (!reference || !reference.trim()) return null;

  const referenceWords = reference.trim().split(/\s+/);
  const hypothesisWords = (hypothesis ?? '').trim().split(/\s+/).filter(Boolean);

  const maxWordCount = Math.max(referenceWords.length, hypothesisWords.length);
  if (maxWordCount === 0) return null;

  const distance = wordLevenshteinDistance(hypothesisWords, referenceWords);
  const accuracy = (1 - distance / maxWordCount) * 100;

  return Math.round(Math.max(0, accuracy) * 100) / 100;
}
