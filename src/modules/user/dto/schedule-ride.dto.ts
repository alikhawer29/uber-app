import { BookRideDto } from './book-ride.dto';

/** Same body as `BookRideDto` — use optional schedule fields on POST /user/rides/book. Kept for backward-compatible POST /user/rides/schedule. */
export class ScheduleRideDto extends BookRideDto {}
