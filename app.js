if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRouter = require("./route/listing.js");
const reviewsRouter = require("./route/review.js");
const usersRouter = require("./route/user.js");
const bookingsRouter = require("./route/booking.js");

function createApp(store) {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.engine("ejs", ejsMate);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride("_method"));
  app.use(express.static(path.join(__dirname, "public")));

  // Keep the session cookie unavailable to browser scripts and secure in production.
  app.use(
    session({
      store,
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  );
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(User.authenticate()));
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.searchQuery = "";
    next();
  });

  app.use("/", bookingsRouter);
  app.use("/listings", listingsRouter);
  app.use("/listings/:id/reviews", reviewsRouter);
  app.use("/", usersRouter);

  app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const statusCode =
      err.statusCode ||
      err.status ||
      (err.name === "ValidationError" || err.name === "MulterError" ? 400 : 500);
    const message =
      statusCode === 500 ? "Something went wrong. Please try again." : err.message;
    res.status(statusCode).render("error.ejs", { message });
  });

  return app;
}

async function startServer() {
  const requiredEnvironment = ["ATLASDB_URL", "SECRET"];
  const missingEnvironment = requiredEnvironment.filter(
    (key) => !process.env[key]
  );

  if (missingEnvironment.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvironment.join(", ")}`
    );
  }

  // Do not accept requests until the database connection is ready.
  await mongoose.connect(process.env.ATLASDB_URL);
  console.log("Connected to database");

  const store = MongoStore.create({
    mongoUrl: process.env.ATLASDB_URL,
    crypto: { secret: process.env.SECRET },
    touchAfter: 24 * 3600,
  });
  store.on("error", (error) => {
    console.error("MongoDB session store error:", error);
  });

  const app = createApp(store);
  const port = process.env.PORT || 8080;
  return app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Application startup failed:", error);
    process.exitCode = 1;
  });
}

module.exports = { createApp, startServer };
