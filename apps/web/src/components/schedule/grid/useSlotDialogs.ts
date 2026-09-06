"use client";

import { useState } from "react";

export interface TrialConversionData {
  id: string;
  childName: string;
  childAge: number;
  parentPhone: string;
}

export function useSlotDialogs() {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [selectedMakeupDate, setSelectedMakeupDate] = useState<string | null>(
    null
  );

  const [instructorOpen, setInstructorOpen] = useState(false);

  const [trialOpen, setTrialOpen] = useState(false);
  const [selectedTrialDate, setSelectedTrialDate] = useState<string | null>(
    null
  );
  const [selectedTrialSessionId, setSelectedTrialSessionId] = useState<
    string | null
  >(null);

  const [convertTrialOpen, setConvertTrialOpen] = useState(false);
  const [selectedTrialForConversion, setSelectedTrialForConversion] =
    useState<TrialConversionData | null>(null);

  return {
    enroll: {
      isOpen: enrollOpen,
      setOpen: setEnrollOpen,
      open: () => setEnrollOpen(true),
      close: () => setEnrollOpen(false),
    },
    makeup: {
      isOpen: makeupOpen,
      setOpen: setMakeupOpen,
      selectedDate: selectedMakeupDate,
      open: (date: string) => {
        setSelectedMakeupDate(date);
        setMakeupOpen(true);
      },
      close: () => setMakeupOpen(false),
    },
    instructor: {
      isOpen: instructorOpen,
      setOpen: setInstructorOpen,
      open: () => setInstructorOpen(true),
      close: () => setInstructorOpen(false),
    },
    trial: {
      isOpen: trialOpen,
      setOpen: setTrialOpen,
      selectedDate: selectedTrialDate,
      selectedSessionId: selectedTrialSessionId,
      open: (date: string, sessionId: string | null) => {
        setSelectedTrialDate(date);
        setSelectedTrialSessionId(sessionId);
        setTrialOpen(true);
      },
      close: () => setTrialOpen(false),
    },
    convertTrial: {
      isOpen: convertTrialOpen,
      setOpen: setConvertTrialOpen,
      selectedTrial: selectedTrialForConversion,
      open: (trial: TrialConversionData) => {
        setSelectedTrialForConversion(trial);
        setConvertTrialOpen(true);
      },
      close: () => setConvertTrialOpen(false),
    },
  };
}
