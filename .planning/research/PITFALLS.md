# Pitfalls Research

**Researched:** 2026-01-24
**Focus:** Common mistakes in workforce apps, location tracking, Expo mobile development

## Location Tracking Pitfalls

### 1. Requesting Background Location Permission
**Warning Signs:**
- App requests "Always" location permission
- Location tracking continues when app is closed
- High battery drain complaints

**Prevention:**
- Only request foreground permission (`requestForegroundPermissionsAsync`)
- Capture location only at check-in moment, not continuously
- Never use background location for this use case

**Phase:** Phase 2 (Location Integration)

---

### 2. Poor GPS Accuracy Handling
**Warning Signs:**
- Users flagged for geofence failures when standing in office
- Inconsistent verification results
- Complaints from users in basement/indoor locations

**Prevention:**
- Accept location with accuracy ≤ 100m (configurable)
- Store accuracy value, show it in admin view
- Make geofence radius generous (≥ 100m default)
- Allow manual override by super admin

**Phase:** Phase 2 (Location Integration)

---

### 3. Mandatory Location for All Users
**Warning Signs:**
- Remote workers can't check in
- Field workers in areas with poor GPS blocked
- Compliance issues in certain jurisdictions

**Prevention:**
- Location is opt-in per policy, not per user
- Work modes (Remote, FieldVisit) skip geofence verification
- Only Office mode triggers geofence check
- Allow check-in without location (marked "unverified")

**Phase:** Phase 2 (Location Integration)

---

## Mobile Development Pitfalls (Expo)

### 4. Using Expo Go for Location Features
**Warning Signs:**
- Location works in development, fails in production
- "Background location not available" errors
- Features work on iOS but not Android

**Prevention:**
- Use development builds (`npx expo run:android`, `npx expo run:ios`)
- Test location on real devices, not simulators
- Build with EAS for production testing early

**Phase:** Phase 5 (Mobile App)

---

### 5. iOS Location Permission Rejection
**Warning Signs:**
- App rejected by Apple for location usage
- Users confused by permission prompts
- Permission granted but location fails

**Prevention:**
- Provide clear `NSLocationWhenInUseUsageDescription` in app.json
- Explain why location is needed BEFORE requesting
- Handle permission denial gracefully (allow check-in, mark unverified)

**Phase:** Phase 5 (Mobile App)

---

### 6. Android API Level Compatibility
**Warning Signs:**
- App crashes on older Android devices
- Location permissions behave differently across Android versions
- Android 11+ requires explicit background permission flow

**Prevention:**
- Set minimum SDK to 24 (Android 7.0)
- Test on Android 11+ specifically for permissions
- Use expo-location which handles API differences

**Phase:** Phase 5 (Mobile App)

---

## Reporting Pitfalls

### 7. Slow Report Generation
**Warning Signs:**
- Report endpoints timeout
- Users wait 30+ seconds for PDF
- Database queries consume excessive resources

**Prevention:**
- Add indexes on date columns used in reports
- Limit date ranges (max 3 months per report)
- Generate large reports async, email when ready
- Cache commonly requested report data

**Phase:** Phase 4 (Reporting)

---

### 8. PDF Generation Memory Issues
**Warning Signs:**
- Server crashes during PDF generation
- Puppeteer processes pile up
- Memory leaks in long-running servers

**Prevention:**
- Use Puppeteer with `--no-sandbox --disable-setuid-sandbox`
- Close browser instance after each PDF
- Set page timeout (30s max)
- Limit concurrent PDF generations (use queue)

**Phase:** Phase 4 (Reporting)

---

## Data Privacy Pitfalls

### 9. Location Data Visible to Managers
**Warning Signs:**
- Managers asking "where was this person?"
- Location data in team views
- Privacy complaints from employees

**Prevention:**
- Location data ONLY visible to Super Admin
- Managers see "Verified ✓" or "Unverified" only
- No location history timeline for anyone
- Clear documentation of what's collected

**Phase:** Phase 2, ongoing

---

### 10. Activity Data as Surveillance
**Warning Signs:**
- Employees feel monitored
- Resistance to status updates
- Gaming the system (fake status updates)

**Prevention:**
- Activity is self-reported, not automatic
- Focus on "what I'm working on" not "prove you're working"
- No idle time tracking, no keystroke logging
- Make it useful to employees (helps others know how to reach them)

**Phase:** Phase 3 (Activity Tracking)

---

## Codebase Quality Pitfalls

### 11. Fixing Bugs While Adding Features
**Warning Signs:**
- New features break existing functionality
- Unclear what's broken vs incomplete
- Regressions after each change

**Prevention:**
- Write tests for existing functionality BEFORE fixing
- Fix core auth/attendance first, verify working, then add features
- Use feature flags to isolate new code
- Commit frequently, smaller changes

**Phase:** Phase 1 (Fix Core)

---

### 12. Inconsistent API Response Formats
**Warning Signs:**
- Frontend handles different response shapes per endpoint
- Error handling code duplicated everywhere
- Unclear what fields are optional

**Prevention:**
- Standardize response wrapper: `{ data, error, meta }`
- Use DTOs consistently with class-validator
- Document API contract in OpenAPI/Swagger
- Frontend uses generated types from shared package

**Phase:** Phase 1 (Fix Core)

---

## Timeline Pitfalls

### 13. Underestimating Mobile Development
**Warning Signs:**
- "Mobile is just like web" assumption
- Platform-specific bugs discovered late
- No time for App Store/Play Store review

**Prevention:**
- Start mobile early, not at the end
- Test on both iOS and Android continuously
- Account for 1-2 weeks for store submission/review
- Internal distribution (TestFlight, Firebase App Distribution) for initial rollout

**Phase:** Phase 5 (Mobile App)

---

### 14. Scope Creep During Execution
**Warning Signs:**
- "While we're here, let's also add..."
- MVP keeps growing
- Features shipping incomplete

**Prevention:**
- Lock MVP scope before execution
- Post-MVP features go to backlog, not current sprint
- If something is cut, it stays cut until MVP ships
- Regular check-ins against original requirements

**Phase:** All phases

---

## Summary

| Risk Level | Pitfall | Phase |
|------------|---------|-------|
| High | Background location permission | 2 |
| High | Expo Go limitations | 5 |
| High | PDF memory issues | 4 |
| Medium | GPS accuracy handling | 2 |
| Medium | iOS permission rejection | 5 |
| Medium | Slow report generation | 4 |
| Medium | Fixing while building | 1 |
| Low | Scope creep | All |
