# Razorpay booking payments

The booking flow uses Razorpay in INR. A guest requests dates, the listing host
approves the request, and the guest then pays through Razorpay Checkout. A
booking is confirmed only after the server verifies the Razorpay signature,
checks the payment amount/order, and captures the payment.

1. Copy `.env.example` to `.env` if the project does not already have one.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to test keys from the
   Razorpay dashboard. Keep the secret on the server; never put it in browser
   code or commit it to source control.
3. Restart the app with `npm start`.
4. Sign in with a guest account, open a listing, choose dates, and send a
   booking request.
5. Sign in as the listing owner, open **Hosting requests**, and approve it.
6. Sign back in as the guest, open **My trips**, and pay the approved request.

Use Razorpay test mode and its test payment details before configuring live
keys. The host approval/payment window is 24 hours.
