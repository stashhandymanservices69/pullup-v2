# Pull Up Coffee - SOP Pack (v1)

## SOP 1 - Merchant Onboarding
1. Merchant submits application in Merchant Portal.
2. Verify cafe details in Firestore cafes collection.
3. Admin approves cafe via admin API approve endpoint.
4. Merchant logs in and connects Stripe account.
5. Confirm Stripe verify endpoint returns ready.
6. Merchant sets menu and opens status to online.

## SOP 2 - Customer Order Lifecycle
1. Customer selects cafe and builds cart.
2. Checkout captures customer + vehicle details.
3. Payment redirects to Stripe Checkout.
4. On success, app returns to tracking state.
5. Merchant accepts/rejects in dashboard.
6. If delayed, merchant sends SMS delay notice.
7. Merchant marks completed once handoff is done.

## SOP 3 - Merch Order (Manual MVP)
1. Customer purchases hat from Merchandise page.
2. Stripe collects payment + AU shipping address.
3. Owner receives Stripe payment notification.
4. Create order in Printful using saved template.
5. Paste shipping details from Stripe payment.
6. Submit Printful order and store tracking reference.

## SOP 4 - Refund & Dispute Handling
1. Identify order ID and issue category.
2. Merchant resolves first under ACL supplier responsibility.
3. If technical issue, open support ticket with order ID.
4. Process refund from Stripe dashboard if approved.
5. Log outcome in internal issue tracker.

## SOP 5 - Security Operations
1. Rotate admin token monthly.
2. Rotate Stripe/Twilio secrets quarterly.
3. Keep firebase-admin credentials out of repo.
4. Audit access logs and failed auth attempts weekly.
5. Run dependency updates + security scan monthly.

## SOP 6 - Incident Response
1. Triage severity: Payment, Data, Availability, Abuse.
2. Isolate affected endpoint/feature.
3. Roll back recent risky changes if needed.
4. Notify impacted stakeholders.
5. Post-incident review and preventive patch.
## SOP 7 - Affiliate Program & Compliance
1. **Affiliate Structure**: Affiliates earn 25% of the platform service fee for 30 days from each cafe they successfully onboard.
2. **ACCC Disclosure Requirements**: All affiliate marketing materials must clearly disclose the material connection and commission arrangement per Australian Consumer Law.
3. **Spam Act 2003 Compliance**: 
   - Affiliates must obtain explicit opt-in consent before sending commercial electronic messages.
   - All affiliate communications must include clear unsubscribe mechanism.
   - Sender identification must be accurate and not misleading.
4. **Payout Calculation Example (Current Model - First 100 Cafes)**: 
   - Cafe charges $2.00 curbside fee.
   - Cafe receives 80% = $1.60.
   - Platform receives 20% = $0.40.
   - From platform's $0.40: covers 30¢ Stripe fixed fee + 10¢ gross margin.
   - Affiliate receives 25% of platform share = $0.10 (100% of platform net margin during promo period).
   - After platform operating costs and tax, net profit may be ~$0.00-0.02 per order during early adopter phase.
5. **Payout Calculation Example (Post-100 Model - Future Cafes)**: 
   - Cafe charges $2.00 curbside fee.
   - Cafe receives 80% = $1.60.
   - Platform receives 20% = $0.40.
   - Customer pays 30¢ Stripe fixed fee (added at checkout).
   - Platform keeps full $0.40 for services (SMS, hosting, support, development, insurance).
   - Affiliate receives 25% of $0.40 = $0.10 for 30 days.
   - Platform net margin improves to ~$0.20-0.25 per order after operating costs.
6. **Payout Schedule**: Affiliate commissions are paid monthly via bank transfer, with 7-day reconciliation period after month-end.
7. **Verification Process**:
   - Affiliate must provide ABN/ACN for tax compliance.
   - Bank account details verified via manual review.
   - Referral links tracked using unique affiliate codes in URL parameters.
8. **Prohibited Practices**:
   - No false representation of cafe partnership status.
   - No unauthorized use of Pull Up or cafe trademarks.
   - No spamming, misleading claims, or deceptive advertising.
   - No incentivizing fake cafe signups.
9. **Termination Grounds**: Violation of Spam Act, ACL breaches, or fraudulent activity results in immediate termination and commission forfeiture.
10. **Legacy Pricing Protection**: First 100 approved cafes locked into "platform covers 30¢ fixed fee" model permanently as early adopter benefit. Cafe dashboard will display "Early Adopter" badge.