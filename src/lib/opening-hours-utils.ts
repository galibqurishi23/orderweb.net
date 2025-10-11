import type { OpeningHours, OpeningHoursPerDay } from './types';

export function isRestaurantOpen(openingHours: OpeningHours): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[now.getDay()];
  const currentDay = openingHours[dayOfWeek] as OpeningHoursPerDay;
  
  if (!currentDay || currentDay.closed) {
    return false;
  }
  
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
  
  // Handle single time mode
  if (currentDay.timeMode === 'single') {
    if (currentDay.openTime && currentDay.closeTime) {
      const openTime = parseTimeString(currentDay.openTime);
      const closeTime = parseTimeString(currentDay.closeTime);
      
      // Handle times that cross midnight
      if (closeTime < openTime) {
        return currentTime >= openTime || currentTime <= closeTime;
      }
      
      return currentTime >= openTime && currentTime <= closeTime;
    }
    return false;
  }
  
  // Handle split time mode (morning and evening)
  // Check morning hours
  if (currentDay.morningOpen && currentDay.morningClose) {
    const morningOpenTime = parseTimeString(currentDay.morningOpen);
    const morningCloseTime = parseTimeString(currentDay.morningClose);
    
    if (currentTime >= morningOpenTime && currentTime <= morningCloseTime) {
      return true;
    }
  }
  
  // Check evening hours
  if (currentDay.eveningOpen && currentDay.eveningClose) {
    const eveningOpenTime = parseTimeString(currentDay.eveningOpen);
    const eveningCloseTime = parseTimeString(currentDay.eveningClose);
    
    // Handle times that cross midnight
    if (eveningCloseTime < eveningOpenTime) {
      return currentTime >= eveningOpenTime || currentTime <= eveningCloseTime;
    }
    
    return currentTime >= eveningOpenTime && currentTime <= eveningCloseTime;
  }
  
  return false;
}

export function getRestaurantStatus(openingHours: OpeningHours): {
  isOpen: boolean;
  message: string;
  nextOpenTime?: string;
} {
  const now = new Date();
  const isOpen = isRestaurantOpen(openingHours);
  
  if (isOpen) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[now.getDay()];
    const currentDay = openingHours[dayOfWeek] as OpeningHoursPerDay;
    
    // Determine which period we're in and when it closes
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (currentDay.timeMode === 'single') {
      if (currentDay.closeTime) {
        return {
          isOpen: true,
          message: `Open until ${formatTime(currentDay.closeTime)}`
        };
      }
    } else {
      // Split mode - check which period we're in
      if (currentDay.morningOpen && currentDay.morningClose) {
        const morningOpenTime = parseTimeString(currentDay.morningOpen);
        const morningCloseTime = parseTimeString(currentDay.morningClose);
        
        if (currentTime >= morningOpenTime && currentTime <= morningCloseTime) {
          return {
            isOpen: true,
            message: `Open until ${formatTime(currentDay.morningClose)}`
          };
        }
      }
      
      if (currentDay.eveningOpen && currentDay.eveningClose) {
        return {
          isOpen: true,
          message: `Open until ${formatTime(currentDay.eveningClose)}`
        };
      }
    }
  }
  
  // Find next opening time
  const nextOpenTime = findNextOpenTime(openingHours, now);
  
  return {
    isOpen: false,
    message: nextOpenTime ? `Closed - Opens ${nextOpenTime}` : 'Temporarily Closed',
    nextOpenTime
  };
}

function parseTimeString(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 100 + minutes;
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function findNextOpenTime(openingHours: OpeningHours, currentDate: Date): string | undefined {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDayIndex = currentDate.getDay();
  
  // Check if restaurant opens later today
  const today = daysOfWeek[currentDayIndex];
  const todayHours = openingHours[today] as OpeningHoursPerDay;
  
  if (todayHours && !todayHours.closed) {
    const currentTime = currentDate.getHours() * 100 + currentDate.getMinutes();
    
    if (todayHours.timeMode === 'single') {
      if (todayHours.openTime) {
        const openTime = parseTimeString(todayHours.openTime);
        if (currentTime < openTime) {
          return `today at ${formatTime(todayHours.openTime)}`;
        }
      }
    } else {
      // Check morning opening
      if (todayHours.morningOpen) {
        const morningOpenTime = parseTimeString(todayHours.morningOpen);
        if (currentTime < morningOpenTime) {
          return `today at ${formatTime(todayHours.morningOpen)}`;
        }
      }
      
      // Check evening opening
      if (todayHours.eveningOpen) {
        const eveningOpenTime = parseTimeString(todayHours.eveningOpen);
        if (currentTime < eveningOpenTime) {
          return `today at ${formatTime(todayHours.eveningOpen)}`;
        }
      }
    }
  }
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const day = daysOfWeek[dayIndex];
    const dayHours = openingHours[day] as OpeningHoursPerDay;
    
    if (dayHours && !dayHours.closed) {
      const dayName = i === 1 ? 'tomorrow' : day;
      
      if (dayHours.timeMode === 'single' && dayHours.openTime) {
        return `${dayName} at ${formatTime(dayHours.openTime)}`;
      } else if (dayHours.timeMode === 'split') {
        if (dayHours.morningOpen) {
          return `${dayName} at ${formatTime(dayHours.morningOpen)}`;
        } else if (dayHours.eveningOpen) {
          return `${dayName} at ${formatTime(dayHours.eveningOpen)}`;
        }
      }
    }
  }
  
  return undefined;
}

export function getTodaysHours(openingHours: OpeningHours): OpeningHoursPerDay | null {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[now.getDay()];
  return openingHours[dayOfWeek] as OpeningHoursPerDay || null;
}
