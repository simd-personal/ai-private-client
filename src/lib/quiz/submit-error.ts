type FlattenedZodError = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export function messageFromLeadApiError(data: {
  error?: string;
  details?: FlattenedZodError;
}): string {
  const fieldErrors = data.details?.fieldErrors;
  if (fieldErrors) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const msg = messages?.[0];
      if (msg) return msg;
      if (field) return `Please check ${field.replace(/_/g, " ")}`;
    }
  }

  const formError = data.details?.formErrors?.[0];
  if (formError) return formError;

  return data.error ?? "Something went wrong. Please try again.";
}
