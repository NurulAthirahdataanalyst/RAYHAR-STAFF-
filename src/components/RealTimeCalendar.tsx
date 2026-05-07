import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Holiday = {
  date: string;
  name: string;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const RealTimeCalendar = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch("https://www.data.gov.my/api/v1/holidays");

        if (!response.ok) {
          throw new Error(`Holiday API responded with ${response.status}`);
        }

        const data = (await response.json()) as Holiday[];
        setHolidays(data);
      } catch (error) {
        console.error("Error fetching holidays:", error);
      }
    };

    fetchHolidays();
  }, []);

  const holidaysByDate = useMemo(() => {
    return holidays.reduce<Record<string, Holiday>>((acc, holiday) => {
      acc[holiday.date] = holiday;
      return acc;
    }, {});
  }, [holidays]);

  const selectedHoliday = date
    ? holidaysByDate[formatDateKey(date)]
    : undefined;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Real-Time Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          modifiers={{ holiday: holidays.map((holiday) => parseDateKey(holiday.date)) }}
          modifiersClassNames={{ holiday: "border border-primary font-semibold" }}
        />
        {selectedHoliday && (
          <p className="rounded-md bg-muted p-3 text-sm">
            {selectedHoliday.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeCalendar;
