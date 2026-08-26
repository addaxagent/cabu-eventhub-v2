export function normalizePhone(input: string): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("260")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return `+260${digits}`;
}

export function isValidZambianPhone(input: string): boolean {
  if (!input) return false;
  const digitsOnly = input.replace(/\D/g, "");
  let subscriber = digitsOnly;
  if (subscriber.startsWith("260")) {
    subscriber = subscriber.slice(3);
  }
  if (subscriber.startsWith("0")) {
    subscriber = subscriber.slice(1);
  }
  // Must be 9 digits subscriber part starting with 97, 96, 95, or 77 (or 76, 75, 79)
  return /^(97|96|95|77|76|75|79)\d{7}$/.test(subscriber);
}
