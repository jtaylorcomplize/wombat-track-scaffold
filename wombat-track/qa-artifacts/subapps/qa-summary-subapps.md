# Sub-App QA Report - Phase 5

**Generated:** 2025-08-02T07:34:11.159Z

## Summary

- **Total Sub-Apps Tested:** 3
- **Total Routes Tested:** 6
- **Successful Routes:** 0
- **Failed Routes:** 0
- **Total Errors:** 25
- **Total Warnings:** 0
- **Critical Issues:** 0

## Sub-App Details

### VisaCalc

**Description:** Visa calculation and processing application

**Summary:**
- Routes Tested: 2
- Successful: 0
- Failed: 0
- Errors: 9
- Warnings: 0

**Routes:**

#### ⚠️ VisaCalc Dashboard

- **Path:** `/subapps/visacalc`
- **Status:** WARNING
- **Load Time:** 2036ms
- **Elements:** 287
- **Errors:** 25
- **Warnings:** 0
- **Screenshots:** visacalc-main-full.png, visacalc-main-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ❌
  - responsiveLayout: ✅
  - subAppSpecificContent: ❌

#### ⚠️ VisaCalc Project View

- **Path:** `/subapps/visacalc/project/demo-project-1`
- **Status:** WARNING
- **Load Time:** 1152ms
- **Elements:** 287
- **Errors:** 20
- **Warnings:** 0
- **Screenshots:** visacalc-project-full.png, visacalc-project-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ❌
  - responsiveLayout: ✅
  - subAppSpecificContent: ❌


### SPQR Looker Studio

**Description:** SPQR reporting and analytics dashboard

**Summary:**
- Routes Tested: 2
- Successful: 0
- Failed: 0
- Errors: 8
- Warnings: 0

**Routes:**

#### ⚠️ SPQR Dashboard

- **Path:** `/subapps/spqr`
- **Status:** WARNING
- **Load Time:** 1157ms
- **Elements:** 287
- **Errors:** 16
- **Warnings:** 0
- **Screenshots:** spqr-main-full.png, spqr-main-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ✅
  - responsiveLayout: ✅
  - subAppSpecificContent: ✅

#### ⚠️ SPQR Report View

- **Path:** `/subapps/spqr/report/quarterly-analysis`
- **Status:** WARNING
- **Load Time:** 1141ms
- **Elements:** 287
- **Errors:** 12
- **Warnings:** 0
- **Screenshots:** spqr-report-full.png, spqr-report-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ✅
  - responsiveLayout: ✅
  - subAppSpecificContent: ✅


### Cz-BKGM

**Description:** Background management and compliance system

**Summary:**
- Routes Tested: 2
- Successful: 0
- Failed: 0
- Errors: 8
- Warnings: 0

**Routes:**

#### ⚠️ BKGM Dashboard

- **Path:** `/subapps/bkgm`
- **Status:** WARNING
- **Load Time:** 1037ms
- **Elements:** 288
- **Errors:** 8
- **Warnings:** 0
- **Screenshots:** bkgm-main-full.png, bkgm-main-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ✅
  - responsiveLayout: ✅
  - subAppSpecificContent: ✅

#### ⚠️ BKGM Project View

- **Path:** `/subapps/bkgm/project/compliance-audit-1`
- **Status:** WARNING
- **Load Time:** 1142ms
- **Elements:** 288
- **Errors:** 4
- **Warnings:** 0
- **Screenshots:** bkgm-project-full.png, bkgm-project-viewport.png
- **Validation:**
  - pageLoaded: ✅
  - noBlankPage: ✅
  - noErrorBoundary: ✅
  - hasExpectedContent: ✅
  - responsiveLayout: ✅
  - subAppSpecificContent: ✅


