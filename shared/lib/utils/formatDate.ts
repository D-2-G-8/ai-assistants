type FormatDateOptions = {
  includeYear?: boolean;
};

export const formatDate = (
  value: string | null | undefined,
  options?: FormatDateOptions
): string => {
  if (!value) return "";
  const date = new Date(value);
  const includeYear = options?.includeYear ?? false;
  const config: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };

  if (includeYear) {
    config.year = "numeric";
  }

  return new Intl.DateTimeFormat("en", config).format(date);
};
