'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  defaultMonth?: Date;
}

export function SimpleCalendar({
  selected,
  onSelect,
  disabled = () => false,
  defaultMonth = new Date(),
}: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(defaultMonth);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return isSameDay(date, today);
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 h-10 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          const isSelectedDate = isSameDay(date, selected || null);
          const isTodayDate = isToday(date);
          const isDisabled = disabled(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isDisabled && onSelect?.(date)}
              disabled={isDisabled}
              className={`
                h-10 w-full rounded-full text-sm font-medium
                transition-all duration-200
                ${isDisabled 
                  ? 'text-gray-300 opacity-40 cursor-not-allowed' 
                  : 'hover:bg-gray-100 hover:scale-105 cursor-pointer'
                }
                ${isTodayDate && !isSelectedDate
                  ? 'bg-red-500 text-white font-bold shadow-lg hover:bg-red-600'
                  : ''
                }
                ${isSelectedDate && !isTodayDate
                  ? 'bg-blue-500 text-white font-semibold shadow-md'
                  : ''
                }
                ${!isTodayDate && !isSelectedDate && !isDisabled
                  ? 'text-gray-900'
                  : ''
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
