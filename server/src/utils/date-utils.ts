import dayjs from "dayjs"

export function routeDurationInMs(departureTime: number, arrivalTime: number) {
  return dayjs(arrivalTime).diff(departureTime)
}
