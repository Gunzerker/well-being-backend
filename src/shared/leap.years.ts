export const isLeapYear = (year: number) => {
  if (year % 4 != 0) {
  } else if (year % 100 != 0) {
    return true;
  } else if (year % 400 != 0) {
    return false;
  } else {
    return true;
  }
};
