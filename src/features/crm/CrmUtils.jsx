import dayjs from "dayjs";

function formatDisplayDate(value) {
  if (!value) return "";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "";
}

export { formatDisplayDate };
