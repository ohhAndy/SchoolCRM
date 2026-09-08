import { clientFetch } from "../_fetch/client";

export interface TrialRequestItem {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  childName: string;
  childAge: number;
  preferredDates: string[];
  notes: string | null;
  status: "pending" | "approved" | "declined" | "spam";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  locationId: string | null;
  location?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  reviewedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface TrialRequestsResponse {
  items: TrialRequestItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  counts: {
    all: number;
    pending: number;
    approved: number;
    declined: number;
    spam: number;
  };
}

export interface TrialRequestStats {
  pending: number;
  approved: number;
  declined: number;
  spam: number;
  todayCount: number;
  total: number;
}

export async function getTrialRequests(params?: {
  status?: string;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TrialRequestsResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.locationId) q.set("locationId", params.locationId);
  if (params?.search) q.set("search", params.search);
  if (params?.page) q.set("page", params.page.toString());
  if (params?.limit) q.set("limit", params.limit.toString());

  const res = await clientFetch(`/trial-requests?${q.toString()}`);
  return res.json();
}

export async function getTrialRequestStats(): Promise<TrialRequestStats> {
  const res = await clientFetch("/trial-requests/stats");
  return res.json();
}

export async function updateTrialRequestStatus(
  id: string,
  status: "pending" | "approved" | "declined" | "spam",
): Promise<TrialRequestItem> {
  const res = await clientFetch(`/trial-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function updateTrialRequestNotes(
  id: string,
  notes: string | null,
): Promise<TrialRequestItem> {
  const res = await clientFetch(`/trial-requests/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function bookTrialRequestSession(
  id: string,
  payload: {
    classSessionId: string;
    classRatio?: string;
    notes?: string;
  },
): Promise<{
  trialBooking: {
    id: string;
    childName: string;
    classSessionId: string;
  };
  trialRequest: TrialRequestItem;
}> {
  const res = await clientFetch(`/trial-requests/${id}/book`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteTrialRequest(id: string): Promise<{ success: boolean }> {
  const res = await clientFetch(`/trial-requests/${id}`, {
    method: "DELETE",
  });
  return res.json();
}
