"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { fetchPublicAPI } from "@/lib/api";

import {
  FormData,
  LocationOption,
  TrialDate,
  TRIAL_LOCATIONS,
  COOKIE_NAME,
  MAX_DATES,
  MAX_CHILDREN,
  ChildSwimmer,
} from "./types";
import {
  getCookie,
  setCookie,
  formatPhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  scrollToFirstErrorOrTop,
} from "./utils";

import { StepIndicator } from "./steps/StepIndicator";
import { Step1LocationContact } from "./steps/Step1LocationContact";
import { Step2SwimmerInfo } from "./steps/Step2SwimmerInfo";
import { Step3DateSelection } from "./steps/Step3DateSelection";
import { Step4Review } from "./steps/Step4Review";
import { TrialSuccessView } from "./steps/TrialSuccessView";

function TrialFormInner() {
  const formTopRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");

  const [locations, setLocations] = useState<LocationOption[]>(TRIAL_LOCATIONS);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    participantType: "child",
    locationSlug: TRIAL_LOCATIONS[0].slug, // Default to Newmarket
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    children: [
      {
        id: "child-1",
        name: "",
        age: "",
        skillLevel: "",
      },
    ],
    siblingPreference: "simultaneous",
    isSelfBooking: true,
    swimmerName: "",
    swimmerAge: "",
    skillLevelOrGoal: "",
    preferredDates: [],
    timePreferences: ["flexible"],
    timePreference: "flexible",
    notes: "",
  });

  const [availableDates, setAvailableDates] = useState<TrialDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check for existing submission cookie
  useEffect(() => {
    const cookie = getCookie(COOKIE_NAME);
    if (cookie) {
      setHasExistingRequest(true);
    }
  }, []);

  // Fetch dynamic locations from Supabase via API
  useEffect(() => {
    async function loadLocations() {
      try {
        const data =
          await fetchPublicAPI<
            Array<{
              id: string;
              name: string;
              slug: string;
              address?: string | null;
            }>
          >("/locations");
        if (Array.isArray(data) && data.length > 0) {
          const mapped: LocationOption[] = data.map((l) => ({
            id: l.id,
            slug: l.slug || l.id,
            name: l.name,
            address: l.address || "",
            city: l.slug?.toLowerCase().includes("newmarket")
              ? "Newmarket"
              : "Markham",
          }));
          // Prioritize Newmarket as the first option
          mapped.sort((a, b) => {
            const aIsNewmarket =
              a.slug.toLowerCase().includes("newmarket") ||
              a.name.toLowerCase().includes("newmarket");
            const bIsNewmarket =
              b.slug.toLowerCase().includes("newmarket") ||
              b.name.toLowerCase().includes("newmarket");
            if (aIsNewmarket && !bIsNewmarket) return -1;
            if (!aIsNewmarket && bIsNewmarket) return 1;
            return 0;
          });
          setLocations(mapped);
        }
      } catch (e) {
        console.error("Failed to load trial locations:", e);
      }
    }
    loadLocations();
  }, []);

  // Sync initial location from URL param or default to Newmarket
  useEffect(() => {
    if (locations.length > 0) {
      if (locationParam) {
        const match = locations.find(
          (l) =>
            l.slug.toLowerCase() === locationParam.toLowerCase() ||
            l.id.toLowerCase() === locationParam.toLowerCase(),
        );
        if (match) {
          setFormData((prev) => ({ ...prev, locationSlug: match.slug }));
          return;
        }
      }
      if (!formData.locationSlug) {
        const newmarket = locations.find(
          (l) =>
            l.slug.toLowerCase().includes("newmarket") ||
            l.name.toLowerCase().includes("newmarket"),
        );
        setFormData((prev) => ({
          ...prev,
          locationSlug: newmarket?.slug || locations[0].slug,
        }));
      }
    }
  }, [locationParam, locations, formData.locationSlug]);

  // Fetch available dates strictly for the selected location
  const loadDates = useCallback(async (slug: string) => {
    if (
      !slug ||
      slug.toLowerCase().includes("angus") ||
      slug.toLowerCase().includes("swim-team")
    ) {
      setAvailableDates([]);
      setLoadingDates(false);
      return;
    }

    try {
      setLoadingDates(true);
      const endpoint = `/trial-dates?locationSlug=${encodeURIComponent(slug)}`;
      const dates = await fetchPublicAPI<TrialDate[]>(endpoint);
      setAvailableDates(dates);
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  }, []);

  const prevLocationSlugRef = useRef(formData.locationSlug);

  useEffect(() => {
    if (
      prevLocationSlugRef.current &&
      prevLocationSlugRef.current !== formData.locationSlug
    ) {
      // Reset selected dates when location changes to prevent booking invalid dates
      setFormData((prev) => ({ ...prev, preferredDates: [] }));
    }
    prevLocationSlugRef.current = formData.locationSlug;

    if (
      formData.locationSlug.toLowerCase().includes("angus") ||
      formData.locationSlug.toLowerCase().includes("swim-team")
    ) {
      setStep(1);
    }

    if (formData.locationSlug) {
      loadDates(formData.locationSlug);
    }
  }, [formData.locationSlug, loadDates]);

  const updateField = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addChild = () => {
    if (formData.children.length >= MAX_CHILDREN) return;
    const newId = `child-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setFormData((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        { id: newId, name: "", age: "", skillLevel: "" },
      ],
    }));
  };

  const removeChild = (id: string) => {
    if (formData.children.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      children: prev.children.filter((c) => c.id !== id),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`child_${id}_name`];
      delete next[`child_${id}_age`];
      return next;
    });
  };

  const updateChild = (id: string, field: keyof ChildSwimmer, value: string) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    }));
    const errorKey = `child_${id}_${field}`;
    if (fieldErrors[errorKey] || fieldErrors[`child_${field}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        delete next[`child_${field}`];
        return next;
      });
    }
  };

  const handlePhoneChange = (rawValue: string) => {
    const formatted = formatPhoneNumber(rawValue);
    updateField("contactPhone", formatted);
  };

  const toggleDate = (dateStr: string) => {
    setFormData((prev) => {
      const dates = prev.preferredDates.includes(dateStr)
        ? prev.preferredDates.filter((d) => d !== dateStr)
        : prev.preferredDates.length < MAX_DATES
          ? [...prev.preferredDates, dateStr]
          : prev.preferredDates;
      return { ...prev, preferredDates: dates };
    });
    if (fieldErrors.preferredDates) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.preferredDates;
        return next;
      });
    }
  };

  const removeDate = (dateStr: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredDates: prev.preferredDates.filter((d) => d !== dateStr),
    }));
  };

  const clearAllDates = () => {
    setFormData((prev) => ({
      ...prev,
      preferredDates: [],
    }));
  };

  const selectedLocation = locations.find(
    (l) => l.slug === formData.locationSlug,
  );

  const isSwimTeam =
    formData.locationSlug.toLowerCase().includes("angus") ||
    formData.locationSlug.toLowerCase().includes("swim-team") ||
    selectedLocation?.name.toLowerCase().includes("swim team") === true;

  const effectiveAdultSwimmerName =
    formData.participantType === "adult" && formData.isSelfBooking
      ? formData.contactName
      : formData.swimmerName;

  const validateStep = (stepNum: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepNum === 1) {
      if (!formData.locationSlug) {
        errors.locationSlug = "Please select a preferred pool location to proceed";
      }
      if (
        !formData.contactName.trim() ||
        formData.contactName.trim().length < 2
      ) {
        errors.contactName =
          formData.participantType === "adult"
            ? "Please enter your full name"
            : "Please enter the parent/guardian name";
      }
      if (!isValidPhoneNumber(formData.contactPhone)) {
        errors.contactPhone =
          "Please enter a valid 10-digit phone number (e.g. (555) 123-4567)";
      }
      if (!isValidEmail(formData.contactEmail)) {
        errors.contactEmail = "Please enter a valid email address";
      }

      if (isSwimTeam) {
        const firstChild = formData.children[0];
        if (!firstChild?.name?.trim() || firstChild.name.trim().length < 2) {
          errors.child_name = "Please enter the swimmer's full name";
        }
        const age = parseInt(firstChild?.age || "", 10);
        if (!firstChild?.age || isNaN(age) || age < 0 || age > 18) {
          errors.child_age = "Please enter an age between 0 and 18";
        }
      }
    }

    if (stepNum === 2) {
      if (formData.participantType === "child") {
        const isMulti = formData.children.length > 1;
        formData.children.forEach((child, idx) => {
          if (!child.name.trim() || child.name.trim().length < 2) {
            errors[`child_${child.id}_name`] = isMulti
              ? `Please enter Child ${idx + 1}'s name`
              : "Please enter your child's name";
          }
          const age = parseInt(child.age, 10);
          if (!child.age || isNaN(age) || age < 0 || age > 17) {
            errors[`child_${child.id}_age`] = "Please enter an age between 0 and 17";
          }
        });
      } else {
        // Adult trial
        if (!formData.isSelfBooking) {
          if (
            !formData.swimmerName.trim() ||
            formData.swimmerName.trim().length < 2
          ) {
            errors.swimmerName = "Please enter the adult swimmer's name";
          }
        }
        const age = parseInt(formData.swimmerAge, 10);
        if (
          !formData.swimmerAge ||
          isNaN(age) ||
          age < 18 ||
          age > 99
        ) {
          errors.swimmerAge = "Please enter a valid adult age (18+)";
        }
      }
    }

    if (stepNum === 3) {
      if (formData.preferredDates.length === 0) {
        errors.preferredDates = "Please select at least one preferred trial date";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4));
      setTimeout(() => {
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else {
      scrollToFirstErrorOrTop(formTopRef);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleSubmit = async () => {
    if (isSwimTeam) {
      if (!validateStep(1)) {
        scrollToFirstErrorOrTop(formTopRef);
        return;
      }
    }

    setError("");
    setSubmitting(true);

    try {
      const cleanSkill = (level?: string) => {
        if (!level) return "";
        return level.replace(/\s*\([^)]*\)/g, "").trim();
      };

      const isAdult = formData.participantType === "adult";
      const notesParts: string[] = [];

      if (isSwimTeam) {
        const firstChild = formData.children[0];
        const swimmerAgeInt = parseInt(firstChild?.age || "0", 10);
        const swimmerNameFinal = (firstChild?.name || "").trim();

        if (formData.notes.trim()) {
          const clean = formData.notes.trim();
          notesParts.push(
            clean.toLowerCase().startsWith("[parent note")
              ? clean
              : `[Parent Notes: ${clean}]`,
          );
        }

        const result = await fetchPublicAPI<{
          success: boolean;
          cookieId: string;
          message: string;
        }>("/trial-requests", {
          method: "POST",
          body: JSON.stringify({
            locationSlug: formData.locationSlug,
            parentName: formData.contactName.trim(),
            parentPhone: formData.contactPhone.trim(),
            parentEmail: formData.contactEmail.trim() || undefined,
            childName: swimmerNameFinal,
            childAge: swimmerAgeInt,
            children: [
              {
                name: swimmerNameFinal,
                age: swimmerAgeInt,
              },
            ],
            preferredDates: [],
            notes: notesParts.join("\n") || undefined,
            cookieId: getCookie(COOKIE_NAME) || undefined,
          }),
        });

        if (result.success) {
          setCookie(COOKIE_NAME, result.cookieId, 30);
          setSubmitted(true);
        }
        return;
      }

      if (isAdult) {
        const swimmerAgeInt = parseInt(formData.swimmerAge, 10);
        const swimmerNameFinal = effectiveAdultSwimmerName.trim();

        notesParts.push("[Adult Trial]");
        if (formData.skillLevelOrGoal) {
          notesParts.push(`[Goal: ${cleanSkill(formData.skillLevelOrGoal)}]`);
        }
        if (formData.notes.trim()) {
          const clean = formData.notes.trim();
          notesParts.push(clean.toLowerCase().startsWith("[parent note") ? clean : `[Parent Notes: ${clean}]`);
        }

        const result = await fetchPublicAPI<{
          success: boolean;
          cookieId: string;
          message: string;
        }>("/trial-requests", {
          method: "POST",
          body: JSON.stringify({
            locationSlug: formData.locationSlug,
            parentName: formData.contactName.trim(),
            parentPhone: formData.contactPhone.trim(),
            parentEmail: formData.contactEmail.trim() || undefined,
            childName: swimmerNameFinal,
            childAge: swimmerAgeInt,
            preferredDates: formData.preferredDates,
            timePreference: formData.timePreferences[0] || formData.timePreference || "flexible",
            timePreferences: formData.timePreferences,
            notes: notesParts.join("\n") || undefined,
            cookieId: getCookie(COOKIE_NAME) || undefined,
          }),
        });

        if (result.success) {
          setCookie(COOKIE_NAME, result.cookieId, 30);
          setSubmitted(true);
        }
      } else {
        // Child / Youth flow (supports multiple children)
        if (formData.notes.trim()) {
          const clean = formData.notes.trim();
          notesParts.push(clean.toLowerCase().startsWith("[parent note") ? clean : `[Parent Notes: ${clean}]`);
        }

        const isMultiChild = formData.children.length > 1;

        const result = await fetchPublicAPI<{
          success: boolean;
          cookieId: string;
          message: string;
        }>("/trial-requests", {
          method: "POST",
          body: JSON.stringify({
            locationSlug: formData.locationSlug,
            parentName: formData.contactName.trim(),
            parentPhone: formData.contactPhone.trim(),
            parentEmail: formData.contactEmail.trim() || undefined,
            children: formData.children.map((c) => ({
              name: c.name.trim(),
              age: parseInt(c.age, 10),
              skillLevel: c.skillLevel ? cleanSkill(c.skillLevel) : undefined,
            })),
            siblingPreference: isMultiChild ? formData.siblingPreference : undefined,
            preferredDates: formData.preferredDates,
            timePreference: formData.timePreferences[0] || formData.timePreference || "flexible",
            timePreferences: formData.timePreferences,
            notes: notesParts.join("\n") || undefined,
            cookieId: getCookie(COOKIE_NAME) || undefined,
          }),
        });

        if (result.success) {
          setCookie(COOKIE_NAME, result.cookieId, 30);
          setSubmitted(true);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again or call us directly.";
      setError(msg);
      setTimeout(() => {
        const errorEl =
          document.getElementById("submission-error-bottom") ||
          document.getElementById("submission-error-banner");
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (formTopRef.current) {
          formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ SUCCESS STATE ============
  if (submitted) {
    return (
      <TrialSuccessView
        formData={formData}
        selectedLocation={selectedLocation}
        effectiveAdultSwimmerName={effectiveAdultSwimmerName}
      />
    );
  }

  const steps = [
    { num: 1, label: "Location & Info" },
    {
      num: 2,
      label:
        formData.participantType === "adult"
          ? "Swimmer & Goals"
          : formData.children.length > 1
            ? "Children Info"
            : "Child Info",
    },
    { num: 3, label: "Pick Dates" },
    { num: 4, label: "Review" },
  ];

  return (
    <div ref={formTopRef} className="scroll-mt-28">
      {/* Existing request banner */}
      {hasExistingRequest && (
        <div className="mb-8 p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-brand-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-brand-800 font-semibold text-sm">
              You&apos;ve already submitted a trial request!
            </p>
            <p className="text-brand-700 text-sm mt-1">
              Our team will be in touch soon. Families may register up to 5 children for trial lessons. You can still submit another request for additional children if you haven&apos;t reached the 5-child limit. If you have any questions or are unsure of your request status, please{" "}
              <Link
                href="/contact"
                className="underline font-semibold hover:text-brand-900 transition-colors"
              >
                contact our office
              </Link>{" "}
              for assistance.
            </p>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      {!isSwimTeam && <StepIndicator steps={steps} step={step} />}

      {/* Top Error display */}
      {error && (
        <div
          id="submission-error-banner"
          className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 shadow-xs animate-fade-in"
        >
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-bold text-sm">
              Unable to Submit Request
            </p>
            <p className="text-red-700 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ============ STEP 1 ============ */}
      {step === 1 && (
        <Step1LocationContact
          formData={formData}
          locations={locations}
          fieldErrors={fieldErrors}
          updateField={updateField}
          handlePhoneChange={handlePhoneChange}
          updateChild={updateChild}
        />
      )}

      {/* ============ STEP 2 ============ */}
      {step === 2 && (
        <Step2SwimmerInfo
          formData={formData}
          fieldErrors={fieldErrors}
          updateField={updateField}
          addChild={addChild}
          removeChild={removeChild}
          updateChild={updateChild}
        />
      )}

      {/* ============ STEP 3 ============ */}
      {step === 3 && (
        <Step3DateSelection
          formData={formData}
          availableDates={availableDates}
          loadingDates={loadingDates}
          fieldErrors={fieldErrors}
          selectedLocation={selectedLocation}
          toggleDate={toggleDate}
          removeDate={removeDate}
          clearAllDates={clearAllDates}
          updateField={updateField}
        />
      )}

      {/* ============ STEP 4 ============ */}
      {step === 4 && (
        <Step4Review
          formData={formData}
          selectedLocation={selectedLocation}
          effectiveAdultSwimmerName={effectiveAdultSwimmerName}
          onEditLocation={() => setStep(1)}
          updateField={updateField}
        />
      )}

      {/* ============ Navigation ============ */}
      <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
        {step > 1 && !isSwimTeam ? (
          <button
            type="button"
            onClick={prevStep}
            className="btn-secondary !py-2.5 !px-6"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <div />
        )}

        {isSwimTeam ? (
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {error && (
              <div
                id="submission-error-bottom"
                className="w-full sm:max-w-md p-3.5 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2.5 shadow-xs animate-fade-in text-left"
              >
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-800 font-bold text-xs sm:text-sm">
                    Unable to Submit Request
                  </p>
                  <p className="text-red-700 text-xs sm:text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full sm:w-auto">
              <a
                href="tel:2897639339"
                className="btn-secondary !py-3 !px-5 inline-flex items-center justify-center gap-2 text-center"
              >
                <Phone size={16} />
                Questions? Call (289) 763-9339
              </a>
              <button
                type="button"
                id="submit-swim-team-request"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary !py-3 !px-8 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Request of Interest
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : step < 4 ? (
          <button
            type="button"
            onClick={nextStep}
            className="btn-primary !py-2.5 !px-6"
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {error && (
              <div
                id="submission-error-bottom"
                className="w-full sm:max-w-md p-3.5 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2.5 shadow-xs animate-fade-in text-left"
              >
                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-800 font-bold text-xs sm:text-sm">
                    Unable to Submit Request
                  </p>
                  <p className="text-red-700 text-xs sm:text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary !py-3 !px-8 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TrialForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      }
    >
      <TrialFormInner />
    </Suspense>
  );
}
