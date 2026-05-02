'use client';

import { DateField, DateRangePicker, RangeCalendar } from '@heroui/react';
import {
  CalendarDate,
  getLocalTimeZone,
  parseDate,
  today,
  type DateValue,
} from '@internationalized/date';

type RangeValue = { start: DateValue; end: DateValue } | null;

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeInputProps {
  value?: DateRange;
  onChange?: (range: DateRange | null) => void;
  isDisabled?: boolean;
  className?: string;
  placeholder?: string;
  maxDate?: Date;
}

function dateToCalendarDate(date: Date): CalendarDate {
  return parseDate(date.toISOString().slice(0, 10));
}

function calendarDateToDate(value: CalendarDate): Date {
  return value.toDate(getLocalTimeZone());
}

export function DateRangeInput({
  value,
  onChange,
  isDisabled,
  className,
  maxDate,
}: DateRangeInputProps) {
  const heroValue = value
    ? {
        start: dateToCalendarDate(value.from),
        end: dateToCalendarDate(value.to),
      }
    : null;

  const maxValue = maxDate ? dateToCalendarDate(maxDate) : today(getLocalTimeZone());

  const handleChange = (range: RangeValue) => {
    if (!range) {
      onChange?.(null);
      return;
    }
    onChange?.({
      from: calendarDateToDate(range.start as CalendarDate),
      to: calendarDateToDate(range.end as CalendarDate),
    });
  };

  return (
    <DateRangePicker
      value={heroValue}
      onChange={handleChange}
      isDisabled={isDisabled}
      maxValue={maxValue}
      className={className}
    >
      <DateField.Group fullWidth>
        <DateField.Input slot="start">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateRangePicker.RangeSeparator />
        <DateField.Input slot="end">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DateRangePicker.Trigger>
            <DateRangePicker.TriggerIndicator />
          </DateRangePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DateRangePicker.Popover>
        <RangeCalendar aria-label="Tarih aralığı">
          <RangeCalendar.Header>
            <RangeCalendar.YearPickerTrigger>
              <RangeCalendar.YearPickerTriggerHeading />
              <RangeCalendar.YearPickerTriggerIndicator />
            </RangeCalendar.YearPickerTrigger>
            <RangeCalendar.NavButton slot="previous" />
            <RangeCalendar.NavButton slot="next" />
          </RangeCalendar.Header>
          <RangeCalendar.Grid>
            <RangeCalendar.GridHeader>
              {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
            </RangeCalendar.GridHeader>
            <RangeCalendar.GridBody>
              {(date) => <RangeCalendar.Cell date={date} />}
            </RangeCalendar.GridBody>
          </RangeCalendar.Grid>
          <RangeCalendar.YearPickerGrid>
            <RangeCalendar.YearPickerGridBody>
              {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
            </RangeCalendar.YearPickerGridBody>
          </RangeCalendar.YearPickerGrid>
        </RangeCalendar>
      </DateRangePicker.Popover>
    </DateRangePicker>
  );
}
