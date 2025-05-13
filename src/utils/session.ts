// Utility functions for saving and loading quiz progress using cookies
// WARNING: Cookies are limited to ~4KB. For large quiz objects, consider using localStorage instead.

export function saveQuizSession(session: any) {
  document.cookie = `quizSession=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;
}

export function loadQuizSession(): any | null {
  const match = document.cookie.match(/(?:^|; )quizSession=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function clearQuizSession() {
  document.cookie = 'quizSession=; path=/; max-age=0';
}
