# User Authentication: Lesson 4: Registration

We have the API needed to create accounts, so now we can create a registration and login system.

We're going to create a registration and login system that pops up a dialog box when the user needs to register or login, instead of using a separate page for these.

## Header

We'll start with a modification to the header in `public/index.html`

```
  <div class="header">
    <h1>Ticket System</h1>
    <p v-if="user">Welcome {{user.username}}<br><a href="#" @click="logout">Logout</a></p>
    <p v-else><a href="#" @click="toggleForm">Register or Login</a></p>
  </div>
```

Let's add the variables we need in `public/script.js`:

```
  data: {
    showForm: false,
    user: null,
    username: '',
    password: '',
    error: '',
```

and some blank methods in `public/script.js`:

```
  methods: {
    toggleForm() {},
    async register() {},
    async login() {},
    async logout() {},
    async getUser() {},
```

You should be able to run the server:

```
node server.js
```

and see a `Register or Login` link:

![Register or Login link](/screenshots/login.png)

## Modal Dialog

To create the dialog for this system, add the following to `public/index.html`:

```
<transition v-if="showForm" name="modal">
      <div class="modal-mask">
        <div class="modal-wrapper">
          <div class="modal-container">

            <div class="modal-header">
              <h1 class="modal-title">Register or Login</h1>
            </div>
            <div class="modal-body">
              <p v-if="error" class="error">{{error}}</p>
              <label>Username</label>
              <br>
              <input v-model="username">
              <br>
              <label>Password</label>
              <br>
              <input type="password" v-model="password">
            </div>
            <div class="modal-footer">
              <button @click="register" type="button">Register</button>
              <button @click="login" type="button" class="other">Login</button>
              <button @click="toggleForm" type="button" class="close">Close</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
```

This uses new HTML element called `transition` that Vue uses to make it easier to add CSS transitions to elements.

Otherwise, this is just a variety of nested `div` elements, with the inputs needed to ask the user for a username and password, plus buttons to register, login, or close the form.

Now we can add the code for toggling the display of the form in `public/script.js`:

```
    toggleForm() {
      this.error = "";
      this.username = "";
      this.password = "";
      this.showForm = !this.showForm;
    },
```

With these changes, you can reload the web page and see the form open with the Register/Login link and close with the Close button:

![registration form](/screenshots/registration-form.png)

## Register button

Now we can add the code to make our register button work:

```
    async register() {
      this.error = "";
      try {
        let response = await axios.post("/api/users", {
          username: this.username,
          password: this.password
        });
        this.user = response.data;
        // close the dialog
        this.toggleForm();
      } catch (error) {
        this.error = error.response.data.message;
      }
    }
```

We use the `axios` library to send the post request, then take the response and set the user from the JSON data. We also close the dialog.

An important part of this method is that we expect a `message` field in the response data if an error occurs. We keep a variable called `error` that stores any error, and this is shown on the form with a `v-if` directive.

With these changes, you can reload the web page and try registering for accounts. You should try registering for the same username and try leaving the entire form blank, so you can see the errors working.

![registration success](/screenshots/registration-success.png)

Note, if you refresh the page, then the user account is gone and you have to register again. To fix this, we need to provide login functionality.
