'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { convertTrialToStudent } from "@/lib/api/client/trial";
import { searchStudents } from "@/lib/api/client/students";
import type { StudentLite } from "@/lib/api/client/students";

interface ConvertTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trial: {
    id: string;
    childName: string;
    childAge: number;
    parentPhone: string;
  } | null;
  onSuccess: () => void;
  onCreateNewStudent: (trialInfo: { childName: string; childAge: number; parentPhone: string }) => void;
}

export function ConvertTrialDialog({
  open,
  onOpenChange,
  trial,
  onSuccess,
  onCreateNewStudent,
}: ConvertTrialDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (open && trial) {
      // Pre-fill search with trial child name
      setSearchQuery(trial.childName);
      handleSearch(trial.childName);
    } else {
      // Reset on close
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStudentId(null);
      setError(null);
    }
  }, [open, trial]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const results = await searchStudents({ query });
      setSearchResults(results.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search students');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleConvert = async () => {
    if (!trial || !selectedStudentId) return;

    try {
      setConverting(true);
      setError(null);
      await convertTrialToStudent(trial.id, selectedStudentId);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert trial');
    } finally {
      setConverting(false);
    }
  };

  const handleCreateNew = () => {
    if (!trial) return;
    onCreateNewStudent({
      childName: trial.childName,
      childAge: trial.childAge,
      parentPhone: trial.parentPhone,
    });
    onOpenChange(false);
  };

  if (!trial) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Convert Trial to Student</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Converting: {trial.childName} (Age {trial.childAge})
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Search for Existing Student */}
          <div className="space-y-2">
            <Label>Search for Existing Student</Label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                disabled={searching || converting}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={searching || converting}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Student</Label>
              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedStudentId === student.id ? 'bg-blue-50' : ''
                    }`}
                    disabled={converting}
                  >
                    <p className="font-medium">
                      {student.firstName} {student.lastName}
                    </p>
                    {student.shortCode && (
                      <p className="text-xs text-muted-foreground">
                        Code: {student.shortCode}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No students found. Create a new student profile below.
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Create New Student */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCreateNew}
              disabled={converting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create New Student Profile
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Opens the new student form with trial information pre-filled
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!selectedStudentId || converting}
          >
            {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert to Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}