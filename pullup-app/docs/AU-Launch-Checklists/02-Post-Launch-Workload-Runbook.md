# 02 — Post-Launch Workload Runbook (AU)

This is the realistic workload after AU go-live.

## Expected Workload

### Week 1
- **Time:** 2–4 hours/day
- **Focus:** approvals, support, payment mismatches, rapid bug fixes

### Weeks 2–4
- **Time:** 1–2 hours/day
- **Focus:** reconciliation, process tuning, merchant enablement

### Steady State (if stable)
- **Time:** 5–8 hours/week
- **Focus:** operations + support + growth

### If commission program scales quickly
- **Extra:** +5–10 hours/week
- **Focus:** referral fraud checks, payout disputes, quality control

---

## Daily Operating Cadence

### Morning (20–30 min)
- [ ] Review new cafe applications
- [ ] Verify ABN for each pending application
- [ ] Approve/reject and send templated response
- [ ] Review pending/failed orders
- [ ] Check payment exceptions and webhook failures

### Midday (10–15 min)
- [ ] Triage support messages
- [ ] Resolve urgent merchant/customer issues
- [ ] Validate any manual overrides with audit notes

### Evening (10–15 min)
- [ ] Reconcile orders vs Stripe vs bank movement snapshot
- [ ] Note daily metrics (orders, revenue, approvals, incidents)
- [ ] Add next-day priority fixes/tasks

---

## Weekly Cadence (60–90 min once/week)
- [ ] KPI review (conversion, rejection rate, refund rate)
- [ ] Financial reconciliation deep check
- [ ] Top support themes and product fixes
- [ ] Security/admin access review
- [ ] Update FAQ/onboarding docs to reduce repeated tickets

---

## Hiring/Delegation Trigger
Move to part-time operations support when either is true for 2+ weeks:
- [ ] >20 support tickets/week, or
- [ ] >10 new cafe approvals/day, or
- [ ] Daily ops >2 hours/day consistently

---

## Incident Severity and Response Targets
- **P0 (payments down / checkout broken):** acknowledge immediately, mitigate <60 min
- **P1 (major merchant workflow broken):** mitigate same day
- **P2 (minor defects):** batch into weekly release

---

## Minimum Metrics to Track
- [ ] Daily orders
- [ ] Daily gross revenue
- [ ] Completed vs rejected orders
- [ ] Refund count and value
- [ ] Chargeback/dispute count
- [ ] New approved cafes
- [ ] Support ticket count and first-response time
