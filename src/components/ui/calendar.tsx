import { ComponentProps } from "react"
import { DayPicker } from "react-day-picker"
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left"
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("p-3 w-fit max-w-none", className)}
      classNames={{
        // container for all months
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4 w-full",

        // caption & nav
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-medium",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-0"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",

        // use grid so headers and days always align in 7 columns
        table: "w-full border-collapse",              // keep as is
        head_row: "grid grid-cols-7 mb-2",            // <-- grid, not flex
        head_cell:
          "text-muted-foreground rounded-md h-9 font-medium text-xs flex items-center justify-center uppercase tracking-wider",
        row: "grid grid-cols-7",                      // <-- grid, not flex
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-9"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground mx-auto"
        ),

        // range & state styles
        day_range_start:
          "day-range-start bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-l-md rounded-r-none",
        day_range_end:
          "day-range-end bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-r-md rounded-l-none",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-30",
        day_range_middle:
          "aria-selected:bg-accent/50 aria-selected:text-accent-foreground rounded-none",
        day_hidden: "invisible",

        ...classNames,
      }}
      components={{
        PreviousMonthButton: ({ className, ...p }) => (
          <button className={cn("h-7 w-7 absolute left-1", className)} {...p}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        ),
        NextMonthButton: ({ className, ...p }) => (
          <button className={cn("h-7 w-7 absolute right-1", className)} {...p}>
            <ChevronRight className="h-4 w-4" />
          </button>
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
