"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Trash } from "lucide-react";
import { createOffering } from "@/lib/api/client/schedule";
import { useRouter } from "next/navigation";

interface AddFlexibleClassDialogProps {
  termId: string;
  onSuccess?: () => void;
}

export function AddFlexibleClassDialog({
  termId,
  onSuccess,
}: AddFlexibleClassDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState("3");
  const [notes, setNotes] = useState("");
  
  const [sessions, setSessions] = useState([
    { date: "", startTime: "09:00", endTime: "10:00" },
  ]);

  const addSession = () => {
    const firstSession = sessions[0] || { date: "", startTime: "09:00", endTime: "10:00" };
    setSessions([...sessions, { ...firstSession }]);
  };

  const removeSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, field: string, value: string) => {
    const newSessions = [...sessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setSessions(newSessions);
  };

  async function handleCreate() {
    if (!title) {
      toast.error("Title is required");
      return;
    }
    
    // Validate sessions
    const validSessions = sessions.filter(s => s.date && s.startTime && s.endTime);
    if (validSessions.length === 0) {
      toast.error("At least one valid session (date and times) is required");
      return;
    }

    setLoading(true);
    try {
      await createOffering({
        termId,
        type: "flexible",
        title,
        capacity: parseInt(capacity) || 3,
        notes,
        sessions: validSessions,
      });
      setOpen(false);
      setTitle("");
      setCapacity("3");
      setNotes("");
      setSessions([{ date: "", startTime: "09:00", endTime: "10:00" }]);
      
      startTransition(() => {
        router.refresh();
      });
      onSuccess?.();
      toast.success("Flexible course created successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Short Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Short Course</DialogTitle>
          <DialogDescription>
            Create a flexible course with custom dates and times.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Course Name</Label>
            <Input
              id="title"
              placeholder="e.g. Advanced Camp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Session Dates & Times</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addSession}>
                <Plus className="h-4 w-4 mr-1" /> Add Date
              </Button>
            </div>
            
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-md border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">Session {index + 1}</span>
                    {sessions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeSession(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Input 
                      type="date" 
                      value={session.date} 
                      onChange={(e) => updateSession(index, "date", e.target.value)} 
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input 
                          type="time" 
                          value={session.startTime} 
                          onChange={(e) => updateSession(index, "startTime", e.target.value)} 
                        />
                      </div>
                      <div className="flex items-center text-gray-400">-</div>
                      <div className="flex-1">
                        <Input 
                          type="time" 
                          value={session.endTime} 
                          onChange={(e) => updateSession(index, "endTime", e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || isPending || !title}
          >
            {loading || isPending ? "Creating..." : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/90 px-6 py-5 shadow-md border border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
            <p className="text-sm font-medium text-gray-700">Updating…</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
