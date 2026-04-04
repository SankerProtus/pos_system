# Postman Collection Sequence for Current POS Endpoints

## Purpose

This document defines an exact request order for testing the currently active authenticated flows for:

- Auth login
- Payments initialize, verify, submit-otp, webhook
- Sales create, list, void
- Reports daily and weekly

It also includes expected assertions and Postman Tests scripts for each request.

## Base Setup

### Environment Variables

Create these in your Postman Environment:

- baseUrl = http://localhost:5000/api
- email = your existing cashier/admin email
- password = your password
- today = 2026-04-04
- weekStart = 2026-03-29
- token =
- paymentReference =
- saleId =

### Collection Authorization

- Authorization Type: Bearer Token
- Token: {{token}}
- For login request only, set Authorization to No Auth.

---

## Request 1: Login

### Endpoint

POST {{baseUrl}}/auth/login

### Body (JSON)

{
"email": "{{email}}",
"password": "{{password}}"
}

### Expected Assertions

- Status code is 200
- Response has message = Login successful
- Response includes accessToken as non-empty string
- Response includes refreshToken as non-empty string
- Response includes user object with id

### Tests Tab Script

pm.test("200 login", function () {
pm.response.to.have.status(200);
});

pm.test("Login response shape", function () {
const json = pm.response.json();
pm.expect(json.message).to.eql("Login successful");
pm.expect(json.accessToken).to.be.a("string").and.not.empty;
pm.expect(json.refreshToken).to.be.a("string").and.not.empty;
pm.expect(json.user).to.be.an("object");
pm.expect(json.user.id).to.be.a("string").and.not.empty;
});

// Save bearer token for all next authenticated requests
const loginJson = pm.response.json();
pm.environment.set("token", loginJson.accessToken);

---

## Request 2: Daily Report

### Endpoint

GET {{baseUrl}}/reports/daily?date={{today}}

### Expected Assertions

- Status code is 200
- Response has date
- Response has totalRevenue
- Response has totalTransactions
- Response has totalItemsSold
- Response has paymentMethodBreakdown as array

### Tests Tab Script

pm.test("200 daily report", function () {
pm.response.to.have.status(200);
});

pm.test("Daily report shape", function () {
const json = pm.response.json();
pm.expect(json).to.have.property("date");
pm.expect(json).to.have.property("totalRevenue");
pm.expect(json).to.have.property("totalTransactions");
pm.expect(json).to.have.property("totalItemsSold");
pm.expect(json.paymentMethodBreakdown).to.be.an("array");
});

---

## Request 3: Weekly Report

### Endpoint

GET {{baseUrl}}/reports/weekly?weekStart={{weekStart}}

### Expected Assertions

- Status code is 200
- Response has weekStart
- Response has weekEnd
- Response has totalRevenue
- Response has totalTransactions
- Response has days as array

### Tests Tab Script

pm.test("200 weekly report", function () {
pm.response.to.have.status(200);
});

pm.test("Weekly report shape", function () {
const json = pm.response.json();
pm.expect(json).to.have.property("weekStart");
pm.expect(json).to.have.property("weekEnd");
pm.expect(json).to.have.property("totalRevenue");
pm.expect(json).to.have.property("totalTransactions");
pm.expect(json.days).to.be.an("array");
});

---

## Request 4: Initialize CARD Payment

### Endpoint

POST {{baseUrl}}/payments/initialize

### Body (JSON)

{
"amount": 10,
"paymentMethod": "CARD"
}

### Expected Assertions

- Status code is 200
- Response has data.reference
- Response has data.authorizationUrl (string or null)
- Save data.reference into paymentReference environment variable

### Tests Tab Script

pm.test("200 payment initialize CARD", function () {
pm.response.to.have.status(200);
});

pm.test("Payment initialize shape", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("object");
pm.expect(json.data.reference).to.be.a("string").and.not.empty;
pm.expect(json.data).to.have.property("authorizationUrl");
});

const initJson = pm.response.json();
pm.environment.set("paymentReference", initJson.data.reference);

---

## Request 5: Verify Payment (first pass)

### Endpoint

GET {{baseUrl}}/payments/verify/{{paymentReference}}

### Expected Assertions

- Status code is 200
- Response has data object
- Response has data.status
- For CARD flow, data.reference should match paymentReference

### Tests Tab Script

pm.test("200 payment verify", function () {
pm.response.to.have.status(200);
});

pm.test("Payment verify shape", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("object");
pm.expect(json.data).to.have.property("status");

if (json.data.reference) {
pm.expect(json.data.reference).to.eql(pm.environment.get("paymentReference"));
}
});

---

## Request 6: Verify Payment (second pass, cache behavior)

### Endpoint

GET {{baseUrl}}/payments/verify/{{paymentReference}}

### Expected Assertions

- Status code is 200
- Response has data object
- Optional cached field may exist and be true

### Tests Tab Script

pm.test("200 payment verify second pass", function () {
pm.response.to.have.status(200);
});

pm.test("Payment verify second pass shape", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("object");

if (Object.prototype.hasOwnProperty.call(json, "cached")) {
pm.expect(json.cached).to.be.oneOf([true, false]);
}
});

---

## Request 7: Create CASH Sale

### Endpoint

POST {{baseUrl}}/sales

### Body (JSON)

{
"items": [
{
"productId": "REPLACE_WITH_REAL_PRODUCT_ID",
"quantity": 1
}
],
"paymentMethod": "CASH",
"amountPaid": 100
}

### Expected Assertions

- Status code is 201
- Response has data.id
- Response has data.status = COMPLETED
- Response has data.payment.method = CASH
- Save data.id to saleId

### Tests Tab Script

pm.test("201 sale created", function () {
pm.response.to.have.status(201);
});

pm.test("Sale response shape", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("object");
pm.expect(json.data.id).to.be.a("string").and.not.empty;
pm.expect(json.data.status).to.eql("COMPLETED");
pm.expect(json.data.payment).to.be.an("object");
pm.expect(json.data.payment.method).to.eql("CASH");
});

const saleJson = pm.response.json();
pm.environment.set("saleId", saleJson.data.id);

---

## Request 8: List Sales

### Endpoint

GET {{baseUrl}}/sales?status=COMPLETED&limit=5

### Expected Assertions

- Status code is 200
- Response has data array

### Tests Tab Script

pm.test("200 sales list", function () {
pm.response.to.have.status(200);
});

pm.test("Sales list array", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("array");
});

---

## Request 9: Void Sale

### Endpoint

POST {{baseUrl}}/sales/{{saleId}}/void

### Expected Assertions

- Status code is 200
- Response has data.status = VOIDED

### Tests Tab Script

pm.test("200 sale void", function () {
pm.response.to.have.status(200);
});

pm.test("Sale is voided", function () {
const json = pm.response.json();
pm.expect(json.data).to.be.an("object");
pm.expect(json.data.status).to.eql("VOIDED");
});

---

## Request 10: Webhook Negative Test (missing signature)

### Endpoint

POST {{baseUrl}}/payments/webhook

### Headers

- Content-Type: application/json
- x-paystack-signature: (leave missing or fake)

### Body (JSON)

{
"event": "charge.success",
"data": {
"reference": "{{paymentReference}}"
}
}

### Expected Assertions

- Status code is one of 400, 401, or 403
- Response has error string

### Tests Tab Script

pm.test("Webhook rejects invalid signature", function () {
pm.expect(pm.response.code).to.be.oneOf([400, 401, 403]);
});

pm.test("Webhook error shape", function () {
const json = pm.response.json();
pm.expect(json.error).to.be.a("string");
});

---

## Optional Branch: MOBILE_MONEY Flow

Use this branch after Request 4 instead of CARD when testing mobile money.

### MM-1 Initialize MoMo

POST {{baseUrl}}/payments/initialize

Body:
{
"amount": 10,
"paymentMethod": "MOBILE_MONEY",
"phoneNumber": "0240000000",
"items": [
{
"productId": "REPLACE_WITH_REAL_PRODUCT_ID",
"quantity": 1
}
]
}

Assertions:

- Status 200
- data.reference exists
- data.status exists

Save reference to paymentReference.

### MM-2 Submit OTP (only if provider demands OTP)

POST {{baseUrl}}/payments/submit-otp

Body:
{
"reference": "{{paymentReference}}",
"otp": "123456"
}

Assertions:

- Status 200
- data.reference exists
- data.status exists

### MM-3 Poll Verify

GET {{baseUrl}}/payments/verify/{{paymentReference}}

Assertions:

- Status 200
- data.status exists
- If terminal: expect SUCCESS or FAILED/CANCELLED depending on scenario

---

## Common Failure Assertions (Validation and Auth)

### Unauthorized request example (missing token)

Expected:

- 401
- body.error exists

### Payment validation error example

For invalid payload to /payments/initialize, expected:

- 400
- body.error = Validation failed OR endpoint-specific error

### Sales validation error example

For invalid payload to /sales, expected:

- 400
- body.error = Validation failed
- body.details is array

---

## Notes

- The reports routes currently exposed are daily and weekly.
- Payments initialize and sales routes require a valid bearer token.
- Webhook route does not require bearer auth but validates provider signature.
- Replace placeholder productId with an actual product from your database before running sale and mobile money tests.
