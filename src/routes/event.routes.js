const router = require("express").Router();

const {
  getUpcomingEvents,
  searchEvents,
  createEvent,
  getEventDetails,
  joinedEvents,
  manageEvents,
  updateEvent,
  deleteEvent,
  addEventMedia,
  removeEventMedia,
  getExpiredEvents,
  joinFreeEvent,
} = require("../controllers/event.controller");

const {
  firebaseTokenVerify,
  emailVerify,
  blockStatusCheck,
} = require("../middlewares/auth.middleware");

// PATCH /event/:id/join - Join free event
router.patch(
  "/event/:id/join",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  joinFreeEvent
);

router.get("/upcoming-events", getUpcomingEvents);

router.get("/events/expired", getExpiredEvents);

router.get("/search", searchEvents);

router.get(
  "/event-details/:id",
  firebaseTokenVerify,
  emailVerify,
  getEventDetails
);

router.get(
  "/joined-events/:uid",
  firebaseTokenVerify,
  emailVerify,
  joinedEvents
);

router.get(
  "/manage-my-events/:uid",
  firebaseTokenVerify,
  emailVerify,
  manageEvents
);

router.post(
  "/create-events",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  createEvent
);

router.put(
  "/update-events/:id",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  updateEvent
);

router.delete(
  "/event/delete/:id",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  deleteEvent
);

// PUT /event/update/:eventId/media — add media (owner only, max 5 total)
router.put(
  "/event/update/:eventId/media",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  addEventMedia
);

// DELETE /event/update/:eventId/media/:publicId — remove one media item (owner only)
router.delete(
  "/event/update/:eventId/media/:publicId",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  removeEventMedia
);

module.exports = router;