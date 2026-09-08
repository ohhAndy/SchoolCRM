"use client";

import React from "react";
import {
  Sparkles,
  Baby,
  Waves,
  MapPin,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Trophy,
} from "lucide-react";
import { FormData, LocationOption, ChildSwimmer } from "../types";

interface Step1LocationContactProps {
  formData: FormData;
  locations: LocationOption[];
  fieldErrors: Record<string, string>;
  updateField: (field: keyof FormData, value: unknown) => void;
  handlePhoneChange: (rawValue: string) => void;
  updateChild?: (id: string, field: keyof ChildSwimmer, value: string) => void;
}

export function Step1LocationContact({
  formData,
  locations,
  fieldErrors,
  updateField,
  handlePhoneChange,
  updateChild,
}: Step1LocationContactProps) {
  const isAdult = formData.participantType === "adult";
  const isSwimTeam =
    formData.locationSlug.toLowerCase().includes("angus") ||
    formData.locationSlug.toLowerCase().includes("swim-team") ||
    locations
      .find((l) => l.slug === formData.locationSlug)
      ?.name.toLowerCase()
      .includes("swim team") === true;

  return (
    <div className="space-y-7 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 mb-1">
          Select Location & Contact Details
        </h2>
        <p className="text-slate-500 text-sm">
          {isSwimTeam
            ? "Submit your information below and our coordinators will call you to arrange an evaluation."
            : "Tell us who this trial is for, select your preferred pool, and provide your contact information."}
        </p>
      </div>

      {/* Participant Type Switcher (only shown for regular lesson pools) */}
      {!isSwimTeam && (
        <div>
          <label className="form-label mb-2">
            <Sparkles size={14} className="inline mr-1.5 text-brand-500" />
            Who is taking this trial lesson? *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateField("participantType", "child")}
              className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                formData.participantType === "child"
                  ? "border-brand-500 bg-brand-50/80 ring-2 ring-brand-100 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  formData.participantType === "child"
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Baby size={20} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Child / Youth
                </div>
                <div className="text-xs text-slate-500">
                  Ages 0 to 17 (Siblings welcome)
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateField("participantType", "adult")}
              className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                formData.participantType === "adult"
                  ? "border-brand-500 bg-brand-50/80 ring-2 ring-brand-100 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  formData.participantType === "adult"
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Waves size={20} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Adult Swimmer
                </div>
                <div className="text-xs text-slate-500">Ages 18+</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Location Choice Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0">
            <MapPin size={14} className="inline mr-1.5 text-brand-500" />
            Preferred Pool Location *
          </label>
          {!formData.locationSlug && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              Please select one
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {locations.map((loc) => {
            const isSelected = formData.locationSlug === loc.slug;
            const isLocSwimTeam =
              loc.slug.toLowerCase().includes("angus") ||
              loc.name.toLowerCase().includes("swim team");
            return (
              <button
                key={loc.slug}
                type="button"
                onClick={() => updateField("locationSlug", loc.slug)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/90 ring-2 ring-brand-100 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isSelected ? "text-brand-600" : "text-slate-500"
                    }`}
                  >
                    {loc.city}
                  </span>
                  {isSelected ? (
                    <CheckCircle2 size={16} className="text-brand-600" />
                  ) : isLocSwimTeam ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                      Inquiry
                    </span>
                  ) : null}
                </div>
                <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                  {loc.name}
                  {isLocSwimTeam && (
                    <Trophy size={14} className="text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {loc.address}
                </p>
              </button>
            );
          })}
        </div>
        {fieldErrors.locationSlug && (
          <p className="form-error mt-2 font-medium">
            {fieldErrors.locationSlug}
          </p>
        )}
      </div>

      {/* When Swim Team is selected: Simplified Request of Interest Form */}
      {isSwimTeam ? (
        <div className="space-y-6 animate-fade-in">
          {/* Informational Guidance Alert */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-50 via-sky-50 to-teal-50 border-2 border-brand-200 shadow-xs space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Trophy size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Competitive Swim Team Request of Interest
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Swim Team practices rotate across multiple facilities and require an individualized coach assessment. Submit your contact and swimmer details below — our coaching coordinators will call you directly to discuss stroke readiness and coordinate a tryout.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">
              Parent / Guardian Contact Details
            </h3>

            <div>
              <label htmlFor="contactName" className="form-label">
                <User size={14} className="inline mr-1.5" />
                Parent / Guardian Full Name *
              </label>
              <input
                type="text"
                id="contactName"
                className="form-input"
                placeholder="e.g. Jane Smith"
                value={formData.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
              />
              {fieldErrors.contactName && (
                <p className="form-error">{fieldErrors.contactName}</p>
              )}
            </div>

            <div>
              <label htmlFor="contactPhone" className="form-label">
                <Phone size={14} className="inline mr-1.5" />
                Phone Number *
              </label>
              <input
                type="tel"
                id="contactPhone"
                className="form-input"
                placeholder="(555) 123-4567"
                value={formData.contactPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
              {fieldErrors.contactPhone && (
                <p className="form-error">{fieldErrors.contactPhone}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Our coaching staff will call you at this phone number to discuss the tryout.
              </p>
            </div>

            <div>
              <label htmlFor="contactEmail" className="form-label">
                <Mail size={14} className="inline mr-1.5" />
                Email Address (optional)
              </label>
              <input
                type="email"
                id="contactEmail"
                className="form-input"
                placeholder="name@example.com"
                value={formData.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
              />
              {fieldErrors.contactEmail && (
                <p className="form-error">{fieldErrors.contactEmail}</p>
              )}
            </div>
          </div>

          {/* Swimmer Information */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">
              Swimmer Details
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="swimTeamChildName" className="form-label">
                  <User size={14} className="inline mr-1.5" />
                  Swimmer Full Name *
                </label>
                <input
                  type="text"
                  id="swimTeamChildName"
                  className="form-input"
                  placeholder="e.g. Alex Smith"
                  value={formData.children[0]?.name || ""}
                  onChange={(e) => {
                    const firstChild = formData.children[0];
                    if (firstChild && updateChild) {
                      updateChild(firstChild.id, "name", e.target.value);
                    }
                  }}
                />
                {fieldErrors.child_name && (
                  <p className="form-error">{fieldErrors.child_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="swimTeamChildAge" className="form-label">
                  Age *
                </label>
                <input
                  type="number"
                  id="swimTeamChildAge"
                  min="4"
                  max="18"
                  className="form-input"
                  placeholder="e.g. 10"
                  value={formData.children[0]?.age || ""}
                  onChange={(e) => {
                    const firstChild = formData.children[0];
                    if (firstChild && updateChild) {
                      updateChild(firstChild.id, "age", e.target.value);
                    }
                  }}
                />
                {fieldErrors.child_age && (
                  <p className="form-error">{fieldErrors.child_age}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="swimTeamNotes" className="form-label">
                Swimming Background & Goals (optional)
              </label>
              <textarea
                id="swimTeamNotes"
                rows={3}
                className="form-input resize-y"
                placeholder="Tell us about your swimmer's background (e.g. current strokes known, previous swim club or lesson experience, or general schedule availability)..."
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Regular Contact Details */
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="font-semibold text-sm text-slate-800">
            {isAdult ? "Your Contact Information" : "Parent / Guardian Details"}
          </h3>

          <div>
            <label htmlFor="contactName" className="form-label">
              <User size={14} className="inline mr-1.5" />
              {isAdult ? "Your Full Name *" : "Parent/Guardian Name *"}
            </label>
            <input
              type="text"
              id="contactName"
              className="form-input"
              placeholder={isAdult ? "e.g. Alex Johnson" : "e.g. Jane Smith"}
              value={formData.contactName}
              onChange={(e) => updateField("contactName", e.target.value)}
            />
            {fieldErrors.contactName && (
              <p className="form-error">{fieldErrors.contactName}</p>
            )}
          </div>

          <div>
            <label htmlFor="contactPhone" className="form-label">
              <Phone size={14} className="inline mr-1.5" />
              {isAdult ? "Your Phone Number *" : "Contact Phone Number *"}
            </label>
            <input
              type="tel"
              id="contactPhone"
              className="form-input"
              placeholder="(555) 123-4567"
              value={formData.contactPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
            {fieldErrors.contactPhone && (
              <p className="form-error">{fieldErrors.contactPhone}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              We will call or text you to confirm your scheduled slot.
            </p>
          </div>

          <div>
            <label htmlFor="contactEmail" className="form-label">
              <Mail size={14} className="inline mr-1.5" />
              Email Address (optional)
            </label>
            <input
              type="email"
              id="contactEmail"
              className="form-input"
              placeholder="name@example.com"
              value={formData.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
            />
            {fieldErrors.contactEmail && (
              <p className="form-error">{fieldErrors.contactEmail}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
