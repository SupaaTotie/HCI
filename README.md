# HCI Portfolio

## Run locally

This is a static HTML, CSS, and JavaScript project with no package installation required. From the project folder, run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser. The root page redirects to the profile dashboard; the sign-in and create-account previews are available at `/login.html` and `/signup.html`.

## Account demo

The sign-in and registration forms validate their fields in the browser, but they do not authenticate users or create accounts. A production account flow needs a backend for account storage, password hashing, authentication/session management, password recovery, and transport over HTTPS. The remember option stores only the email address locally; it never stores the password.