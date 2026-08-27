import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Download, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useImportEmployeeMaster, usePreviewEmployeeImport } from "@/hooks/use-employees";
import type { EmployeeImportPreviewData, EmployeeImportPreviewError } from "@/types/employee";

const importFormSchema = z.object({
  file: z.any(),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

interface EmployeeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPreviewData(data: EmployeeImportPreviewData | null) {
  if (!data) return null;
  return `Total rows: ${data.total}. Valid: ${data.valid}. Invalid: ${data.invalid}. New: ${data.newCount}. Updates: ${data.updateCount}.`;
}

export function EmployeeImportDialog({ open, onOpenChange }: EmployeeImportDialogProps) {
  const [previewData, setPreviewData] = useState<EmployeeImportPreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewValidationErrors, setPreviewValidationErrors] = useState<EmployeeImportPreviewError[] | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const previewMutation = usePreviewEmployeeImport();
  const importMutation = useImportEmployeeMaster();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
  });

  const watchedFile = watch("file");

  useEffect(() => {
    if (!open) {
      setPreviewData(null);
      setPreviewError(null);
      setSelectedFileName(null);
      setFileToUpload(null);
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!watchedFile || !watchedFile[0]) {
      setSelectedFileName(null);
      return;
    }
    const file = watchedFile[0] as File;
    setSelectedFileName(file.name);
    setFileToUpload(file);
  }, [watchedFile]);

  const handlePreview = async () => {
    setPreviewError(null);
    setPreviewData(null);

    if (!fileToUpload) {
      setPreviewError("Please select an Excel file to preview.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const data = await previewMutation.mutateAsync(formData);
      setPreviewData(data);
      setPreviewValidationErrors(data.errors);
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string; details?: unknown } } })?.response?.data?.error ??
        "Failed to preview the import.";
      setPreviewError(message);
      setPreviewValidationErrors(
        (error as { response?: { data?: { details?: EmployeeImportPreviewError[] } } })?.response?.data?.details ?? null,
      );
    }
  };

  const handleImport = async () => {
    if (!fileToUpload) {
      setPreviewError("Please select an Excel file to import.");
      return;
    }

    if (previewValidationErrors && previewValidationErrors.length > 0) {
      setPreviewError("Please fix preview validation errors before importing.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      await importMutation.mutateAsync(formData);
      onOpenChange(false);
    } catch (error) {
      setPreviewError(
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to import the employee master.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Employee Master</DialogTitle>
          <DialogDescription>
            Upload an Excel file to preview and import employee records. Relay must be set as Relay A, Relay B, or Relay C.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(() => undefined)}>
          <div className="grid gap-3">
            <Label htmlFor="file">Excel file</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              {...register("file")}
            />
            {errors.file?.message && (
              <p className="text-xs text-danger">{String(errors.file.message)}</p>
            )}
            {selectedFileName && (
              <p className="text-sm text-muted-foreground">Selected: {selectedFileName}</p>
            )}
          </div>

          {previewError && (
            <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              {previewError}
            </div>
          )}

          {previewData && (
            <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary-foreground">
              <p>{formatPreviewData(previewData)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {previewData.errors.length > 0
                  ? `${previewData.errors.length} validation issue(s) found.`
                  : "No validation issues found."}
              </p>
              {previewData.cleaning?.map((item) => (
                <p key={item} className="mt-1 text-xs text-muted-foreground">{item}</p>
              ))}
            </div>
          )}

          {previewValidationErrors && previewValidationErrors.length > 0 && (
            <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              <div className="font-medium">Preview validation errors</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-danger">
                {previewValidationErrors.slice(0, 10).map((error, index) => (
                  <li key={index}>
                    Row {error.row}: {error.field ?? "General"} — {error.error}
                  </li>
                ))}
                {previewValidationErrors.length > 10 && (
                  <li>And {previewValidationErrors.length - 10} more...</li>
                )}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePreview}
                disabled={!fileToUpload || previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 size-4" />
                )}
                Preview
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={!fileToUpload || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Import
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
