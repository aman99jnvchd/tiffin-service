/**
 * Formats an array of TimeSlot objects into a collapsed string.
 * Example input: [{ start_time: "07:00 AM", end_time: "08:00 AM" }, { start_time: "08:00 AM", end_time: "09:00 AM" }]
 * Example output: "7-9 AM"
 */
export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface ServiceWindow {
  service: string;
  hours: string;
}

export const formatServiceHours = (windowsStr: string | null): ServiceWindow[] => {
  if (!windowsStr) return [];

  try {
    const windows = JSON.parse(windowsStr);
    const serviceWindows: ServiceWindow[] = [];

    // Helper to format a single service type's slots
    const formatSlots = (service: string, slots: any[]) => {
      if (!slots || slots.length === 0) return;

      // Handle legacy string format ["07:00 AM"] or ["07:00 AM - 08:00 AM"]
      if (typeof slots[0] === 'string') {
        const formattedSlots = slots.map(s => {
          if (s.includes('-')) {
            const [start, end] = s.split('-').map((str: string) => str.trim());
            return formatTimeRange(start, end);
          }
          return formatSingleTime(s);
        });
        serviceWindows.push({ service, hours: formattedSlots.join(', ') });
        return;
      }

      // Handle new object format [{start_time, end_time}]
      if (typeof slots[0] === 'object' && slots[0].start_time) {
        // Collapse consecutive slots
        const ranges: { start_time: string; end_time: string }[] = [];

        let currentRange = { ...slots[0] };

        for (let i = 1; i < slots.length; i++) {
          const slot = slots[i];
          if (currentRange.end_time === slot.start_time) {
            // Consecutive, extend the current range
            currentRange.end_time = slot.end_time;
          } else {
            // Gap, push current and start new
            ranges.push(currentRange);
            currentRange = { ...slot };
          }
        }
        ranges.push(currentRange);

        // Here is the requested logic for a SINGLE overarching operational window for a service
        // using the start times only.
        // We find the earliest start and latest start. (Since they are ordered chronologically by the vendor).
        const firstStart = ranges[0].start_time;
        const lastStart = ranges[ranges.length - 1].start_time;

        let hoursStr = '';
        if (firstStart === lastStart) {
          hoursStr = formatSingleTime(firstStart);
        } else {
          hoursStr = formatTimeRange(firstStart, lastStart);
        }

        serviceWindows.push({ service, hours: hoursStr });
      }
    };

    if (windows.Breakfast?.length > 0) formatSlots("Breakfast", windows.Breakfast);
    if (windows.Lunch?.length > 0) formatSlots("Lunch", windows.Lunch);
    if (windows.Dinner?.length > 0) formatSlots("Dinner", windows.Dinner);

    return serviceWindows;
  } catch (e) {
    return [];
  }
};

export const formatDeliveryWindows = (windowsStr: string | null): string | null => {
  const serviceWindows = formatServiceHours(windowsStr);
  if (serviceWindows.length === 0) return 'No timings set';
  return serviceWindows.map(sw => `${sw.service}: ${sw.hours}`).join(' • ');
};

/**
 * Formats a single time string like "07:00 AM" to "7 AM" or "07:30 AM" to "7:30 AM"
 */
const formatSingleTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeStr;

  let [_, h, m, ampm] = match;
  let hour = parseInt(h, 10).toString(); // remove leading zero

  if (m === '00') {
    return `${hour} ${ampm.toUpperCase()}`;
  }
  return `${hour}:${m} ${ampm.toUpperCase()}`;
};

/**
 * Formats a range like start="07:00 AM", end="09:00 AM" into "7-9 AM"
 * If AM/PM is the same, drops it from the start. e.g. "7 AM" to "9 AM" -> "7-9 AM"
 */
export const formatTimeRange = (startStr: string, endStr: string): string => {
  const start = formatSingleTime(startStr);
  const end = formatSingleTime(endStr);

  const startMatch = start.match(/(.*?)\s+(AM|PM)/i);
  const endMatch = end.match(/(.*?)\s+(AM|PM)/i);

  if (startMatch && endMatch) {
    if (startMatch[2] === endMatch[2]) {
      // Same AM/PM, drop it from start
      return `${startMatch[1]}-${end}`;
    }
  }

  return `${start}-${end}`;
};
