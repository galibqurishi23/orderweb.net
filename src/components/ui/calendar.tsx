"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-6 bg-white rounded-lg shadow-sm", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-lg font-semibold text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 hover:bg-gray-100 transition-colors"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 gap-1 mb-3",
        head_cell:
          "text-gray-600 font-semibold text-sm uppercase tracking-wide text-center w-full h-10 flex items-center justify-center",
        row: "grid grid-cols-7 gap-1 w-full mt-1",
        cell: "text-center w-full h-10 flex items-center justify-center relative p-0",
        day: cn(
          "h-10 w-10 p-0 font-medium rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold shadow-md",
        day_today: "bg-red-500 text-white hover:bg-red-600 font-bold shadow-lg",
        day_outside:
          "text-gray-400 opacity-40",
        day_disabled: "text-gray-300 opacity-40 cursor-not-allowed hover:scale-100",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
