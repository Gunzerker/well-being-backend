export function getLastDayOfMonth(month, year) {
    // Ensure the month is 0-based index (January is 0, February is 1, etc.)
    const adjustedMonth = month - 1;
    
    // Create a new Date object for the next month's first day
    const nextMonthFirstDay = new Date(year, adjustedMonth + 1, 1);
    
    // Subtract 1 day from the next month's first day
    const lastDay = new Date(nextMonthFirstDay.getTime() - 86400000);
    
    // Extract the day component from the last day
    return lastDay.getDate();
  }