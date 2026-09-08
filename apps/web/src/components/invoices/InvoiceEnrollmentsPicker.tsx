"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DAY_LABELS } from "@/lib/schedule/slots";

export interface UnInvoicedEnrollment {
  id: string;
  classRatio: string;
  suggestedAmount: number;
  totalSessions: number;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    level: string;
  };
  offering: {
    id: string;
    weekday: number;
    startTime: string;
    term: {
      name: string;
      location?: {
        name: string;
      };
    };
  };
  enrollmentSkips: {
    id: string;
    enrollmentId: string;
    classSessionId: string;
  }[];
}

interface InvoiceEnrollmentsPickerProps {
  enrollments: UnInvoicedEnrollment[];
  selectedEnrollments: Set<string>;
  toggleEnrollment: (id: string) => void;
  enrollmentAmounts: Record<string, string>;
  setEnrollmentAmounts: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

export function InvoiceEnrollmentsPicker({
  enrollments,
  selectedEnrollments,
  toggleEnrollment,
  enrollmentAmounts,
  setEnrollmentAmounts,
}: InvoiceEnrollmentsPickerProps) {
  if (enrollments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uninvoiced Enrollments</CardTitle>
        <CardDescription>
          Select enrollments to include in this invoice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {enrollments.map((enrollment) => {
            const isSelected = selectedEnrollments.has(enrollment.id);
            const currentAmount =
              enrollmentAmounts[enrollment.id] ??
              enrollment.suggestedAmount.toString();

            const skipCount = enrollment.enrollmentSkips?.length ?? 0;
            const totalSessions = enrollment.totalSessions ?? 0;
            const billableSessions = Math.max(0, totalSessions - skipCount);
            const sessionText =
              skipCount > 0
                ? `${billableSessions} of ${totalSessions} classes`
                : `${totalSessions} ${totalSessions === 1 ? "class" : "classes"}`;

            return (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <Checkbox
                    id={`enrollment-${enrollment.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleEnrollment(enrollment.id)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`enrollment-${enrollment.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {enrollment.student.firstName}{" "}
                      {enrollment.student.lastName}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {DAY_LABELS[enrollment.offering.weekday]}{" "}
                      {enrollment.offering.startTime} •{" "}
                      {enrollment.student.level} •{" "}
                      {enrollment.offering.term.name}
                      {enrollment.offering.term.location?.name &&
                        ` (${enrollment.offering.term.location.name})`}{" "}
                      • {enrollment.classRatio} • {sessionText}
                    </p>
                    {skipCount > 0 && (
                      <p className="text-xs text-amber-600">
                        {skipCount} skipped session(s)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24 text-right"
                    value={currentAmount}
                    onChange={(e) => {
                      setEnrollmentAmounts((prev) => ({
                        ...prev,
                        [enrollment.id]: e.target.value,
                      }));
                    }}
                    disabled={!isSelected}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
