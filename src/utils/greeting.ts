/** Time-of-day label for login (title case). */
export function greetingForHour(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good Evening";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Good Night";
}

export const LOGIN_WELCOME_TITLE = "Welcome Back";
export const LOGIN_WELCOME_SUBTITLE = "Sign in to continue your field work";
