/**
 * Delivery Day and Timezone Utilities for Dairix
 *
 * Established Timezone: Asia/Kolkata (IST, UTC+05:30)
 *
 * Rules:
 * - A delivery day in Asia/Kolkata starts at 00:00:00.000 IST (18:30:00.000 UTC previous day).
 * - A delivery day cutoff occurs at 23:59:59.999 IST (18:29:59.999 UTC same day).
 * - Any uncompleted delivery for a day whose cutoff has not yet arrived is "pending".
 * - Any uncompleted delivery for a day whose cutoff has passed is "skipped".
 */

export const TIMEZONE = "Asia/Kolkata";
export const TIMEZONE_OFFSET_STR = "+05:30";

/**
 * Returns the YYYY-MM-DD string for a given date in Asia/Kolkata.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export const getKolkataDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
};

/**
 * Returns the start (00:00:00.000 IST) and end (23:59:59.999 IST cutoff)
 * Date objects for the delivery day in Asia/Kolkata.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ startOfDay: Date, endOfDay: Date, dateString: string }}
 */
export const getDeliveryDayRange = (date = new Date()) => {
  const dateString = getKolkataDateString(date);
  const startOfDay = new Date(`${dateString}T00:00:00.000${TIMEZONE_OFFSET_STR}`);
  const endOfDay = new Date(`${dateString}T23:59:59.999${TIMEZONE_OFFSET_STR}`);
  return { startOfDay, endOfDay, dateString };
};

/**
 * Determines whether the scheduled delivery day has fully ended as of a given reference time.
 * The delivery day has fully ended only when referenceDate is strictly past the cutoff (23:59:59.999 IST).
 *
 * @param {Date|string|number} scheduledDate - The scheduled delivery date
 * @param {Date|string|number} [referenceDate=new Date()] - Reference comparison time
 * @returns {boolean} True if the delivery day cutoff has passed
 */
export const isDeliveryDayEnded = (scheduledDate, referenceDate = new Date()) => {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const { endOfDay: cutoff } = getDeliveryDayRange(scheduledDate);
  return ref.getTime() > cutoff.getTime();
};

/**
 * Determines whether the scheduled delivery is for today or a future date in Asia/Kolkata.
 *
 * @param {Date|string|number} scheduledDate
 * @param {Date|string|number} [referenceDate=new Date()]
 * @returns {boolean} True if scheduled for today or future in Asia/Kolkata
 */
export const isTodayOrFutureDelivery = (scheduledDate, referenceDate = new Date()) => {
  const { startOfDay: todayStart } = getDeliveryDayRange(referenceDate);
  const sched = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
  return sched.getTime() >= todayStart.getTime();
};
