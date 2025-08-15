const express = require("express");
const app = express();
const users = require("./router/users.js");
const posts = require("./router/posts.js");
// const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require("path");

const flash = require("connect-flash");

const sessionOption = {
  secret: "mysecretsuperstring",
  resave: false,
  saveUninitialized: true,
};
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session(sessionOption));
app.use(flash());

app.use((req, res, next) => {
  res.locals.successmsg = req.flash("success");
  res.locals.errormsg = req.flash("error");
  next();
});

app.get("/register", (req, res) => {
  let { name = "anonymous" } = req.query;
  req.session.name = name;
  if (name == "ananymous") {
    req.flash("error", "user not registered!");
  } else {
    req.flash("success", "user registered successfully");
  }
  res.redirect("/hello");
});

app.get("/hello", (req, res) => {
  res.render("page.ejs", { name: req.session.name });
});

// app.get("/reqcount", (req, res) => {
//   if (req.session.count) {
//     req.session.count++;
//   } else {
//     req.session.count = 1;
//   }
//   res.send(`You send a request ${req.session.count} time`);
// });

// app.get("/", (req, res) => {
//   res.send("teste succrssful!");
// });

app.listen(3000, () => {
  console.log("server is listening to 3000");
});

// app.use(cookieParser("secretcode"));

// app.get("/getsignedcookies", (req, res) => {
//   res.cookie("made-in", "India", { signed: true });
//   res.send("signed cookies sent");
// });

// app.get("/varify", (req, res) => {
//   console.log(req.cookies);
//   res.send("varified");
// });

// app.get("/getcookies", (req, res) => {
//   res.cookie("greet", "Namsate");
//   res.cookie("MadeIn", "India");
//   res.send("Sent you some cookie");
// });

// app.get("/", (req, res) => {
//   console.dir(res.cookies);
//   res.send("Hi, I am root!");
// });

// app.use("/users", users);
// app.use("/posts", posts);
