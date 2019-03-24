# User Authentication: Lesson 1: Preliminaries

I have supplied you with some code that implements a ticket server and client, nearly identical to what we have done previously. The front end in the `public` directory uses Vue. The back end in the `server` directory uses Node, Express, and Mongo.

To get this code running, you'll need to clone this repository.

After you do this, initialize Node and install some packages:

```
nvm use stable
cd user-authentication
npm init
npm install express mongoose jsonwebtoken cookie-parser

```

You can then run the server and the app should let you create and delete tickets:

```
cd server
node server.js
```

## Modules

If you examine the code in the `server directory`, you'll notice that I have refactored the server into separate modules.

Inside of `server.js`, we require the `tickets.js` module. Notice we have to give it a relative path by starting with the current directory, which is `.`

```
const tickets = require("./tickets.js");
app.use("/api/tickets", tickets);
```

We also call `app.use` to configure the API and in one place we declare that all endpoints regarding tickets will use the prefix `/api/tickets`.

Now, inside of `tickets.js`, we store all of our code related to the ticket schema, model, and API. It starts with:

```
const express = require("express");
const router = express.Router();
```

We then define our routes like this:

```
router.get('/', async (req, res) => {
router.post('/', async (req, res) => {
router.post('/', async (req, res) => {
```

And then at the end we export the router:

```
module.exports = router;
```

Exporting the router is what allows the server to include and then use it.

Organizing our back end code into modules will make it easier to maintain.
