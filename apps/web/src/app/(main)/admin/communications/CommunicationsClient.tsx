"use client";

import { useState, useMemo } from "react";
import { Recipient, sendEmail } from "@/lib/api/client/communications";
import { RecipientManager } from "@/components/communications/RecipientManager";
import { Composer } from "@/components/communications/Composer";
import { CommunicationHistory } from "@/components/communications/CommunicationHistory";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Send, History } from "lucide-react";

export default function CommunicationsClient() {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [dialogSearch, setDialogSearch] = useState("");

  const handleAddRecipient = (newRecipient: Recipient) => {
    setRecipients((prev) => {
      const exists = prev.some(
        (r) => r.email.toLowerCase() === newRecipient.email.toLowerCase(),
      );
      if (exists) return prev;
      return [...prev, newRecipient];
    });
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients((prev) =>
      prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()),
    );
  };

  const handleClearRecipients = () => {
    setRecipients([]);
  };

  const handleSetRecipients = (newList: Recipient[]) => {
    // Deduplicate by email
    const seen = new Set<string>();
    const uniqueList: Recipient[] = [];
    for (const r of newList) {
      const emailLower = r.email.toLowerCase();
      if (!seen.has(emailLower)) {
        seen.add(emailLower);
        uniqueList.push(r);
      }
    }
    setRecipients(uniqueList);
  };

  const handleAppendRecipients = (newItems: Recipient[]) => {
    setRecipients((prev) => {
      const seen = new Set(prev.map((r) => r.email.toLowerCase()));
      const toAdd: Recipient[] = [];
      for (const r of newItems) {
        const emailLower = r.email.toLowerCase();
        if (!seen.has(emailLower)) {
          seen.add(emailLower);
          toAdd.push(r);
        }
      }
      return [...prev, ...toAdd];
    });
  };

  const handleRetryFailed = (failedEmails: string[]) => {
    const failedSet = new Set(failedEmails.map((e) => e.toLowerCase()));
    setRecipients((prev) =>
      prev.filter((r) => failedSet.has(r.email.toLowerCase())),
    );
  };

  const recipientEmails = useMemo(
    () => recipients.map((r) => r.email),
    [recipients],
  );

  const filteredDialogRecipients = useMemo(() => {
    if (!dialogSearch.trim()) return recipients;
    const q = dialogSearch.toLowerCase().trim();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.students.some((s) => s.toLowerCase().includes(q)),
    );
  }, [recipients, dialogSearch]);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
        <p className="text-muted-foreground">
          Send emails to guardians, filter class rosters, and track live delivery statuses.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "compose" | "history")}
        className="w-full space-y-6"
      >
        <div className="border-b pb-1">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-auto">
            <TabsTrigger
              value="compose"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Compose Email</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <History className="h-4 w-4 shrink-0" />
              <span>Sent History & Delivery Status</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: COMPOSE */}
        <TabsContent value="compose" className="space-y-8 mt-0">
          <section>
            <RecipientManager
              recipients={recipients}
              onAddRecipient={handleAddRecipient}
              onRemoveRecipient={handleRemoveRecipient}
              onClearRecipients={handleClearRecipients}
              onSetRecipients={handleSetRecipients}
              onAppendRecipients={handleAppendRecipients}
            />
          </section>

          <Separator />

          <section>
            <Composer
              title="2. Compose Message"
              recipientCount={recipients.length}
              recipientEmails={recipientEmails}
              onSend={sendEmail}
              onViewRecipients={() => setShowRecipientList(true)}
              onViewHistory={() => setActiveTab("history")}
              onRetryFailed={handleRetryFailed}
            />
          </section>
        </TabsContent>

        {/* TAB 2: SENT HISTORY */}
        <TabsContent value="history" className="space-y-6 mt-0">
          <CommunicationHistory />
        </TabsContent>
      </Tabs>

      {/* Recipient List Dialog for Composer */}
      <Dialog open={showRecipientList} onOpenChange={setShowRecipientList}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>Recipient List ({recipients.length})</span>
              {recipients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRecipients}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7"
                >
                  Clear All
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {recipients.length > 0 && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={dialogSearch}
                onChange={(e) => setDialogSearch(e.target.value)}
                placeholder="Filter recipients..."
                className="pl-9 text-sm h-9"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 border rounded-md divide-y">
            {recipients.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground text-sm">
                No recipients selected.
              </p>
            ) : filteredDialogRecipients.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground text-sm">
                No recipients match &quot;{dialogSearch}&quot;.
              </p>
            ) : (
              filteredDialogRecipients.map((r) => (
                <div
                  key={r.email}
                  className="p-3 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-slate-500 text-xs font-mono truncate">
                      {r.email}
                    </div>
                    {r.students && r.students.length > 0 && (
                      <div className="text-slate-400 text-xs truncate mt-0.5">
                        Student(s): {r.students.join(", ")}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRecipient(r.email)}
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    title={`Remove ${r.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
