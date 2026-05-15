const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";

const malaysiaDateTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: MALAYSIA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const parseBackendDateTime = (value: string | number | Date) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();

    // Backend ISO strings from SQLite may omit a timezone even though they represent UTC.
    if (
      /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalizedValue)
    ) {
      return new Date(normalizedValue.replace(" ", "T") + "Z");
    }
  }

  return new Date(value);
};

export const formatMalaysiaDateTime = (value: string | number | Date) => {
  const parsedDate = parseBackendDateTime(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return malaysiaDateTimeFormatter.format(parsedDate);
};
